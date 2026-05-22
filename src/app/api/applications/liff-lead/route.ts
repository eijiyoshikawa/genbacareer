/**
 * POST /api/applications/liff-lead
 *
 * LIFF（LINE 内 webview）から送られてくる lead 送信。
 * 通常の /api/applications/line-lead との差分:
 *  - lineUserId / lineDisplayName を LIFF SDK 経由で取得済の値を信頼
 *  - LIFF accessToken を verify して、なりすましを防止
 *  - status を即 "line_added" にする（LINE 友だち追加が前提のため）
 *  - 続いて LINE 公式アカウントから「ご応募ありがとうございます」push を送る
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { isLineConfigured, buildLineMessage } from "@/lib/line"
import { isMessagingConfigured, pushMessage } from "@/lib/line-messaging"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"
import { notifyNewLead } from "@/lib/lead-notifications"
import { findRelatedJobs } from "@/lib/job-matching"
import { getSessionIdIfExists } from "@/lib/session-id"
import { extractUtmFromUrl } from "@/lib/tracking"
import { verifyLiffAccessToken, isLiffServerConfigured } from "@/lib/liff"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  jobId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  phone: z
    .string()
    .trim()
    .min(8)
    .max(30)
    .regex(/^[0-9+\-()\s]+$/u, "電話番号は数字と記号のみで入力してください"),
  email: z.email().max(255),
  experienceYears: z.number().int().min(0).max(60).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  lineUserId: z.string().min(1).max(50),
  lineDisplayName: z.string().max(100).optional(),
  accessToken: z.string().min(1),
  pageUrl: z.string().url().optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit({
    key: `liff-lead:${ip}`,
    limit: 8,
    windowMs: 10 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  let parsed: z.infer<typeof bodySchema>
  try {
    const body = await request.json().catch(() => ({}))
    parsed = bodySchema.parse(body)
  } catch (err) {
    return Response.json(
      { error: "invalid_body", issues: err instanceof z.ZodError ? err.issues : [] },
      { status: 400 }
    )
  }

  // LIFF access token の verify（なりすまし防止）
  if (isLiffServerConfigured()) {
    const v = await verifyLiffAccessToken(parsed.accessToken)
    if (!v.ok) {
      return Response.json(
        { error: "invalid_liff_token", reason: v.reason },
        { status: 401 }
      )
    }
  }

  // 対象求人
  const job = await prisma.job.findUnique({
    where: { id: parsed.jobId },
    select: {
      id: true,
      title: true,
      prefecture: true,
      city: true,
      helloworkId: true,
      status: true,
    },
  })
  if (!job || job.status !== "active") {
    return Response.json({ error: "job_not_found" }, { status: 404 })
  }

  const sessionId = await getSessionIdIfExists().catch(() => null)
  const referer = request.headers.get("referer")
  const utm = extractUtmFromUrl(parsed.pageUrl ?? referer ?? "")

  // lead 保存（lineUserId / lineDisplayName を直接バインド、status=line_added）
  let leadId: string | null = null
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
        lineUserId: parsed.lineUserId,
        lineDisplayName: parsed.lineDisplayName ?? null,
        status: "line_added",
      },
      select: { id: true },
    })
    leadId = lead.id

    // 通知
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

    // 受付確認 Push（LINE Messaging API 設定済みの場合）
    if (isMessagingConfigured()) {
      const ack = [
        `${parsed.name} さん、ご応募ありがとうございます🎉`,
        "",
        "▼ 応募内容",
        buildLineMessage({
          jobId: job.id,
          title: job.title,
          prefecture: job.prefecture,
          city: job.city,
          helloworkId: job.helloworkId,
        }),
        "",
        "担当より 1 営業日以内にこちらの LINE トークでご連絡いたします。",
      ].join("\n")
      void pushMessage(parsed.lineUserId, [{ type: "text", text: ack }]).catch(() => {})
    }
  } catch (e) {
    console.error(
      `[liff-lead] DB insert failed: ${e instanceof Error ? e.message : e}`
    )
  }

  // おすすめ求人を 3 件
  const recommendedJobs = await findRelatedJobs(job.id, 3).catch(() => [])

  return Response.json({
    success: true,
    leadId,
    configured: isLineConfigured(),
    recommendedJobs,
  })
}
