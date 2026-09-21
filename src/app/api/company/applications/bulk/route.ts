/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: number }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * 取得クエリの where: companyId フィルタで自動除外される。
 *
 * 単一更新 (PUT /api/company/applications/[id]) と同じ
 * applyApplicationStatusChange() を通すことで、遷移バリデーション /
 * hiredAt 打刻 / 採用確定時の自動請求 / 通知 / メールが一括更新でも
 * 単一更新と同様に発生することを保証する。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { applyApplicationStatusChange } from "@/lib/application-status"

const ALLOWED_STATUSES = [
  "applied",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(ALLOWED_STATUSES),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const actorUserId = (session.user as { id?: string }).id ?? "unknown"

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Bad Request", issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const { ids, status } = parsed.data

  const applications = await prisma.application.findMany({
    where: { id: { in: ids }, companyId },
    select: {
      id: true,
      userId: true,
      status: true,
      statusHistory: true,
      hiredAt: true,
      user: { select: { email: true, name: true } },
      job: { select: { title: true } },
      company: { select: { name: true } },
    },
  })

  let updated = 0
  let skipped = 0

  for (const application of applications) {
    const result = await applyApplicationStatusChange({
      application,
      newStatus: status,
      actorUserId,
    })
    if (result.ok) {
      updated++
    } else {
      skipped++
    }
  }

  return Response.json({ ok: true, updated, skipped })
}
