/**
 * POST /api/admin/line-leads/[id]/push-message
 *
 * 管理者が lead に紐付いた LINE ユーザーへ Push メッセージを送る。
 * - lead.lineUserId が必須（友だち追加 + bind 済みの lead のみ送信可）
 * - body: { jobIds: string[] }     → 推薦する求人を 1〜5 件指定
 *         { freeText?: string }    → 任意の追記テキスト
 * - 求人カード形式（タイトル + 給与 + URL）をテキストにまとめて送信
 *
 * LINE Messaging API の Channel Access Token が必要（既設定済み）。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { pushMessage, isMessagingConfigured, type LineMessage } from "@/lib/line-messaging"
import { buildJobRecommendationFlex } from "@/lib/line-flex-builders"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
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

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  if (!isMessagingConfigured()) {
    return Response.json(
      { error: "line_not_configured", message: "LINE_CHANNEL_ACCESS_TOKEN が未設定です" },
      { status: 503 }
    )
  }

  const { id } = await ctx.params

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

  // lead と求人を並列取得
  const [lead, jobs] = await Promise.all([
    prisma.lineLead
      .findUnique({
        where: { id },
        select: { id: true, lineUserId: true, name: true },
      })
      .catch(() => null),
    prisma.job
      .findMany({
        where: { id: { in: parsed.jobIds }, status: "active" },
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
      .catch(() => []),
  ])

  if (!lead) return Response.json({ error: "lead_not_found" }, { status: 404 })
  if (!lead.lineUserId) {
    return Response.json(
      {
        error: "line_not_bound",
        message: "この lead はまだ LINE ユーザーと紐付いていません。LINE 表示名で手動 bind してから再送してください。",
      },
      { status: 400 }
    )
  }
  if (jobs.length === 0) {
    return Response.json({ error: "no_active_jobs" }, { status: 404 })
  }

  // テキスト挨拶 + Flex カルーセル の 2 通組で送る
  const introLines = [`${lead.name} さんへ`]
  if (parsed.freeText) introLines.push("", parsed.freeText)
  introLines.push("", "ご希望に近いと思われる求人をお送りします👷‍♂️")

  const messages: LineMessage[] = [
    { type: "text", text: introLines.join("\n") },
    buildJobRecommendationFlex({ jobs }),
  ]

  try {
    await pushMessage(lead.lineUserId, messages)
  } catch (e) {
    console.error(`[admin.push] ${e instanceof Error ? e.message : e}`)
    return Response.json({ error: "push_failed" }, { status: 502 })
  }

  return Response.json({ success: true, sentJobCount: jobs.length })
}
