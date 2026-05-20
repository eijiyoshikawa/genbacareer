/**
 * 14.4 Google Calendar 連携解除。
 *
 * POST /api/company/calendar/disconnect
 *  - 企業管理者のみ
 *  - CompanyCalendarOauth の自社レコードを削除
 *  - 既に作成済みの Application.googleCalendarEventId はそのまま残す
 *    (再連携時に新規 event として扱われる想定)
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin") {
    return Response.json(
      { error: "企業管理者のみが解除できます" },
      { status: 403 }
    )
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "企業情報がありません" }, { status: 403 })
  }

  await prisma.companyCalendarOauth
    .delete({ where: { companyId } })
    .catch(() => null)

  return Response.json({ ok: true })
}
