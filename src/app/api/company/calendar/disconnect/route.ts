/**
 * 14.4 Google Calendar 連携解除。
 *
 * POST /api/company/calendar/disconnect
 *  - 企業管理者のみ
 *  - Google 側の OAuth 許可自体を取り消し (ベストエフォート) てから、
 *    CompanyCalendarOauth の自社レコードを削除
 *  - 既に作成済みの Application.googleCalendarEventId はそのまま残す
 *    (再連携時に新規 event として扱われる想定)
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revokeGoogleToken } from "@/lib/google-calendar"

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

  // ローカルの行を消す前に Google 側の許可自体も取り消す（ベストエフォート）。
  // 以前はローカル行を削除するだけで、Google アカウント側には許可が
  // 残り続けていた（「解除」したはずが実際には Google 側で有効なまま）。
  const existing = await prisma.companyCalendarOauth
    .findUnique({ where: { companyId }, select: { refreshToken: true } })
    .catch(() => null)
  if (existing?.refreshToken) {
    await revokeGoogleToken(existing.refreshToken)
  }

  await prisma.companyCalendarOauth
    .delete({ where: { companyId } })
    .catch(() => null)

  return Response.json({ ok: true })
}
