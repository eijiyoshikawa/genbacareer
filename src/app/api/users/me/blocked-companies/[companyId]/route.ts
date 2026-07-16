/**
 * POST   /api/users/me/blocked-companies/[companyId] — ブロック追加
 * DELETE                                              — ブロック解除
 *
 * 17.3 ブロック企業 / NG キーワード設定。
 * 求職者専用、ログイン必須。max 200 件で頭打ち。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const MAX_BLOCKED = 200

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const { companyId } = await params

  // UUID 形式チェック
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
    return Response.json({ error: "企業 ID が不正です" }, { status: 400 })
  }

  // read-modify-write ではなく単一 UPDATE 文で完結させる (array_append + 条件句)。
  // 以前は findUnique → JS 側で配列結合 → update だったため、同一ユーザーからの
  // 2 つの同時リクエスト (別企業を同時ブロック等) が競合すると、後勝ちの update が
  // 先の書き込みを丸ごと上書きし、ブロックが 1 件サイレントに消えることがあった。
  const updated = await prisma.$executeRaw`
    UPDATE users
    SET blocked_company_ids = array_append(blocked_company_ids, ${companyId})
    WHERE id = ${session.user.id}::uuid
      AND NOT (${companyId} = ANY(blocked_company_ids))
      AND COALESCE(array_length(blocked_company_ids, 1), 0) < ${MAX_BLOCKED}
  `

  if (updated === 0) {
    // 何も更新されなかった理由 (ユーザー不明 / 既にブロック済み / 上限到達) を判定。
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { blockedCompanyIds: true },
    })
    if (!user) return Response.json({ error: "ユーザー不明" }, { status: 404 })
    if (user.blockedCompanyIds.includes(companyId)) {
      return Response.json({ ok: true, alreadyBlocked: true })
    }
    return Response.json(
      { error: `ブロック企業は ${MAX_BLOCKED} 件までです` },
      { status: 400 }
    )
  }

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const { companyId } = await params

  // 同上の理由でこちらも array_remove による単一 UPDATE 文に統一する。
  const updated = await prisma.$executeRaw`
    UPDATE users
    SET blocked_company_ids = array_remove(blocked_company_ids, ${companyId})
    WHERE id = ${session.user.id}::uuid
  `
  if (updated === 0) {
    return Response.json({ error: "ユーザー不明" }, { status: 404 })
  }
  return Response.json({ ok: true })
}
