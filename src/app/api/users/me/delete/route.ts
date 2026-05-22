/**
 * DELETE /api/users/me/delete
 *
 * 退会フロー（個人情報保護法 / GDPR の削除権対応）。
 * 物理削除ではなく soft delete + 個人情報の匿名化を行う:
 *   - User.status = "deleted"
 *   - User.email = "deleted+<uuid>@deleted.local"
 *   - User.name / phone / prefecture / city / birthDate / resumeUrl を null 化
 *   - SavedSearch / JobFavorite / CompanyFollow / Notification を物理削除
 *   - Application は残す（企業側の業務記録のため）が、user.name は匿名表示
 *   - Resume は本人 PII を含むため deletion
 *
 * クライアントは確認画面で「退会する」を押下した場合のみここを叩く。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { z } from "zod"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const schema = z.object({
  confirmText: z.literal("退会する"),
  reason: z.string().max(500).optional(),
})

export async function POST(request: Request) {
  // 同一 IP から 1 時間に 5 回まで（誤クリック濫用防止）
  const rl = checkRateLimit({
    key: `delete-account:${getClientIp(request)}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const userId = session.user.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "確認文字列が一致しません。「退会する」と入力してください。" },
      { status: 400 }
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      // PII を匿名化
      // name は "退会済みユーザー" としておくと、企業側 UI に残る Application
      // 履歴で「名前未設定 (= 未入力)」と「退会済み (= 退会)」を区別できる。
      await tx.user.update({
        where: { id: userId },
        data: {
          status: "deleted",
          deletedAt: new Date(),
          email: `deleted+${userId}@deleted.local`,
          name: "退会済みユーザー",
          phone: null,
          prefecture: null,
          city: null,
          birthDate: null,
          resumeUrl: null,
          profilePublic: false,
          passwordHash: null,
          verificationToken: null,
          resetToken: null,
          // 失効しているが念のため期限切れに
          verificationTokenExpiry: null,
          resetTokenExpiry: null,
        },
      })

      // 退会後に通知が来ても困るので関連レコードを削除
      await Promise.all([
        tx.savedSearch.deleteMany({ where: { userId } }).catch(() => null),
        tx.jobFavorite.deleteMany({ where: { userId } }).catch(() => null),
        tx.notification.deleteMany({ where: { userId } }).catch(() => null),
        // メッセージテンプレートはユーザー固有の PII を含むため削除
        tx.applicationMessageTemplate
          .deleteMany({ where: { userId } })
          .catch(() => null),
        // CompanyFollow / Resume が存在する場合は同様に削除
        tx.$executeRawUnsafe(
          `DELETE FROM "company_follows" WHERE "user_id" = $1::uuid`,
          userId
        ).catch(() => null),
        tx.resume.deleteMany({ where: { userId } }).catch(() => null),
      ])
    })
  } catch (e) {
    console.error("[delete-account] failed:", e)
    return Response.json(
      { error: "退会処理に失敗しました。時間を置いて再度お試しください。" },
      { status: 500 }
    )
  }

  // NextAuth セッション Cookie をクリア（クライアント側 signOut で確実に）
  return Response.json({ ok: true })
}
