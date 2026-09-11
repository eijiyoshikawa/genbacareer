/**
 * POST /api/admin/segments/broadcast
 *
 * セグメント条件 + 求人 jobIds を渡し、該当 lead 全員に LINE Push する。
 * - lineUserId が bind 済みの lead のみ送信対象
 * - LINE Messaging API のレート制限を考慮し、10 件ずつ並列処理
 * - 結果を broadcast_logs に保存（送信前に行を作成し、完了後に件数を上書き）
 * - 同一内容のリクエストは 5 分以内の再送を 409 で拒否（二重送信防止）
 *
 * Body:
 *   {
 *     segment: { utmSource?, status?, jobCategory?, jobPrefecture?, viewedCategory?, viewedPrefecture?, lineBound?, createdSinceDays? },
 *     jobIds: string[1..5],
 *     freeText?: string
 *   }
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isMessagingConfigured, pushMessage, type LineMessage } from "@/lib/line-messaging"
import { buildJobRecommendationFlex } from "@/lib/line-flex-builders"
import { resolveSegment, BROADCAST_SEND_LIMIT, type Segment } from "@/lib/segment"
import { LEAD_STATUSES } from "@/lib/line-lead-status"
import { checkRateLimit } from "@/lib/rate-limit"
import { createHash } from "crypto"

export const dynamic = "force-dynamic"
export const maxDuration = 60


const segmentSchema = z
  .object({
    utmSource: z.string().max(100).optional(),
    status: z.enum(LEAD_STATUSES).optional(),
    jobCategory: z.string().max(40).optional(),
    jobPrefecture: z.string().max(40).optional(),
    viewedCategory: z.string().max(40).optional(),
    viewedPrefecture: z.string().max(40).optional(),
    lineBound: z.boolean().optional(),
    createdSinceDays: z.number().int().positive().max(365).optional(),
  })
  .strict()

const bodySchema = z.object({
  segment: segmentSchema,
  jobIds: z.array(z.string().uuid()).min(1).max(5),
  freeText: z.string().max(500).optional(),
})

async function requireAdmin() {
  const session = await auth().catch(() => null)
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) return Response.json({ error: "unauthorized" }, { status: 401 })

  if (!isMessagingConfigured()) {
    return Response.json(
      { error: "line_not_configured" },
      { status: 503 }
    )
  }

  let body: z.infer<typeof bodySchema>
  try {
    const json = await request.json().catch(() => ({}))
    body = bodySchema.parse(json)
  } catch (err) {
    return Response.json(
      { error: "invalid_body", issues: err instanceof z.ZodError ? err.issues : [] },
      { status: 400 }
    )
  }

  // 二重送信防止: 同一内容 (segment + jobIds + freeText) のリクエストが
  // 直近数分以内に既に送信されていれば拒否する。以前はここに何のガードも
  // 無く、管理画面での二度押しやネットワーク再試行がそのまま同じセグメント
  // 全員への二重配信になり得た（かつ送信ループ完了後にしか BroadcastLog を
  // 書いていないため、途中でタイムアウトした場合は記録すら残らなかった）。
  const requestHash = createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex")
  const dedupe = checkRateLimit({
    key: `broadcast-dedup:${requestHash}`,
    limit: 1,
    windowMs: 5 * 60 * 1000,
  })
  if (!dedupe.allowed) {
    return Response.json(
      {
        error: "duplicate_request",
        message:
          "同じ内容の配信が直近 5 分以内に送信済みです。二重送信防止のためブロックしました。",
      },
      { status: 409 }
    )
  }

  // セグメント絞り込み（lineBound=true で必須化）
  const segment: Segment = { ...body.segment, lineBound: true }
  const leads = await resolveSegment(segment, BROADCAST_SEND_LIMIT)
  // 対象 lead 取得
  const jobs = await prisma.job
    .findMany({
      where: { id: { in: body.jobIds }, status: "active" },
      select: {
        id: true,
        title: true,
        prefecture: true,
        city: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        category: true,
        tags: true,
      },
    })
    .catch(() => [])
  if (jobs.length === 0) {
    return Response.json({ error: "no_active_jobs" }, { status: 404 })
  }

  // 送信ループの前に BroadcastLog 行を作っておく（完了後にしか書いて
  // いなかった以前の実装だと、maxDuration=60s のタイムアウト等で送信途中に
  // 関数が強制終了した場合、送信自体は行われたのに記録が一切残らなかった。
  // 先に行を作っておけば、少なくとも「対象件数はここまで解決していた」
  // ことが分かり、完了時に実際の件数で上書きする）。
  const userId = (session.user as { id?: string } | undefined)?.id ?? null
  const logRow = await prisma.broadcastLog
    .create({
      data: {
        segment: JSON.parse(JSON.stringify(body.segment)),
        jobIds: body.jobIds,
        freeText: body.freeText ?? null,
        targetCount: leads.length,
        successCount: 0,
        failureCount: 0,
        skippedCount: 0,
        triggeredBy: userId,
      },
    })
    .catch(() => null)

  // 並列度を 10 件に絞って push（LINE API は短期 burst に弱い）
  const CONCURRENCY = 10
  let success = 0
  let failure = 0
  let skipped = 0

  for (let i = 0; i < leads.length; i += CONCURRENCY) {
    const batch = leads.slice(i, i + CONCURRENCY)
    await Promise.all(
      batch.map(async (lead) => {
        if (!lead.lineUserId) {
          skipped++
          return
        }
        const messages = buildMessages(lead.name, jobs, body.freeText)
        try {
          await pushMessage(lead.lineUserId, messages)
          success++
        } catch (e) {
          failure++
          console.warn(
            `[broadcast] push failed lead=${lead.id} err=${
              e instanceof Error ? e.message : e
            }`
          )
        }
      })
    )
  }

  // 完了後、実際の件数で上書きする（行自体は送信前に作成済み）
  if (logRow) {
    await prisma.broadcastLog
      .update({
        where: { id: logRow.id },
        data: { successCount: success, failureCount: failure, skippedCount: skipped },
      })
      .catch((e) =>
        console.warn(`[broadcast] log update failed: ${e instanceof Error ? e.message : e}`)
      )
  }

  return Response.json({
    success: true,
    targetCount: leads.length,
    successCount: success,
    failureCount: failure,
    skippedCount: skipped,
  })
}

interface JobForBroadcast {
  id: string
  title: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  category: string
  tags: string[]
}

function buildMessages(
  name: string,
  jobs: JobForBroadcast[],
  freeText?: string
): LineMessage[] {
  const intro: string[] = [`${name} さんへ`]
  if (freeText) intro.push("", freeText)
  intro.push("", "条件に合いそうな求人をお送りします👷‍♂️")
  return [
    { type: "text", text: intro.join("\n") },
    buildJobRecommendationFlex({ jobs, altTextPrefix: "新着求人" }),
  ]
}
