/**
 * POST /api/applications/line-lead
 *
 * 「LINE で応募」ミニフォーム送信先。氏名 / 電話 / メール の最低限情報を
 * `line_leads` テーブルに保存し、続けて LINE 公式アカウントへ遷移するための
 * URL を返却する。
 *
 * 旧 /api/jobs/[id]/apply-click の上位互換。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { buildLineApplyUrl, isLineConfigured } from "@/lib/line"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"
import { notifyNewLead } from "@/lib/lead-notifications"
import { findRelatedJobs } from "@/lib/job-matching"
import { getSessionIdIfExists } from "@/lib/session-id"
import { extractUtmFromUrl } from "@/lib/tracking"
import { trackEvent } from "@/lib/track"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().trim().min(1, "氏名は必須です").max(100),
  // 携帯/固定どちらも許容。-/() スペース許容
  phone: z
    .string()
    .trim()
    .min(8, "電話番号は 8 桁以上で入力してください")
    .max(30)
    .regex(/^[0-9+\-()\s]+$/u, "電話番号は数字と記号のみで入力してください"),
  email: z.email("メールアドレスの形式が正しくありません").max(255),
  experienceYears: z.number().int().min(0).max(60).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  // クライアントから渡された参照元 URL（GA4 と DB の流入分析を揃えるため）
  pageUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)

  // 同一 IP からの過剰送信防止: 5 件 / 10 分
  const rl = checkRateLimit({
    key: `line-lead:${ip}`,
    limit: 5,
    windowMs: 10 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  let parsed: z.infer<typeof bodySchema>
  try {
    const body = await request.json().catch(() => ({}))
    parsed = bodySchema.parse(body)
  } catch (err) {
    return Response.json(
      {
        error: "invalid_body",
        issues: err instanceof z.ZodError ? err.issues : [],
      },
      { status: 400 }
    )
  }

  // 対象求人取得（LINE メッセージの pre-fill に必要）
  const job = await prisma.job.findUnique({
    where: { id: parsed.jobId },
    select: {
      id: true,
      title: true,
      category: true,
      prefecture: true,
      city: true,
      helloworkId: true,
      status: true,
    },
  })
  if (!job || job.status !== "active") {
    return Response.json({ error: "job_not_found" }, { status: 404 })
  }

  // 流入トラッキング: SID Cookie + UTM パラメータ + Referer を保存
  const sessionId = await getSessionIdIfExists().catch(() => null)
  const referer = request.headers.get("referer")
  const utm = extractUtmFromUrl(parsed.pageUrl ?? referer ?? "")

  // 二重送信対策: 同一求人 + 電話番号の応募が直近 2 分以内にあれば新規作成せず
  // 既存の lead を使い回す（ダブルタップ / フォームのリトライで重複リード・
  // 重複通知が発生するのを防ぐ）。
  const recentDuplicate = await prisma.lineLead
    .findFirst({
      where: {
        jobId: job.id,
        phone: parsed.phone,
        createdAt: { gte: new Date(Date.now() - 2 * 60 * 1000) },
      },
      select: { id: true },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => null)

  // リード保存。失敗しても致命的ではないが、原則必須なので await する。
  let leadId: string | null = recentDuplicate?.id ?? null
  if (!recentDuplicate) {
    try {
      const lead = await prisma.lineLead.create({
        data: {
          jobId: job.id,
          name: parsed.name,
          phone: parsed.phone,
          email: parsed.email,
          experienceYears: parsed.experienceYears ?? null,
          notes: parsed.notes ?? null,
          ipAddress: ip,
          userAgent: request.headers.get("user-agent")?.slice(0, 500) ?? null,
          sessionId,
          utmSource: utm.source,
          utmMedium: utm.medium,
          utmCampaign: utm.campaign,
          referer: referer?.slice(0, 500) ?? null,
        },
        select: { id: true },
      })
      leadId = lead.id

      // 新規 lead 通知（Slack / メール）。失敗してもユーザー体験は阻害しない。
      void notifyNewLead({
        leadId: lead.id,
        name: parsed.name,
        phone: parsed.phone,
        email: parsed.email,
        experienceYears: parsed.experienceYears ?? null,
        notes: parsed.notes ?? null,
        job: {
          id: job.id,
          title: job.title,
          prefecture: job.prefecture,
          city: job.city,
        },
      })
    } catch (e) {
      // line_leads テーブル未作成などのケースは ensure-schema が走れば次回成功する。
      // この場合でも LINE 遷移は妨げず、ユーザー体験を優先する。
      console.error(
        `[line-lead] DB insert failed: ${e instanceof Error ? e.message : e}`
      )
    }
  }

  const lineUrl = buildLineApplyUrl({
    jobId: job.id,
    title: job.title,
    prefecture: job.prefecture,
    city: job.city,
    helloworkId: job.helloworkId,
  })

  // 「あなたへのおすすめ求人」を 3 件抽出。エラーは無視（フォーム完了体験を阻害しない）。
  const recommendedJobs = await findRelatedJobs(job.id, 3).catch(() => [])

  // 13.4 独自イベントトラッキング
  if (leadId) {
    void trackEvent({
      name: "apply_submit",
      sessionId,
      payload: {
        jobId: job.id,
        leadId,
        category: job.category,
        prefecture: job.prefecture,
        utmSource: utm.source,
      },
    })
  }

  return Response.json({
    success: true,
    leadId,
    lineUrl,
    configured: isLineConfigured(),
    recommendedJobs,
  })
}
