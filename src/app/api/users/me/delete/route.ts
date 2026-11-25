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
import { deleteFileByUrl } from "@/lib/storage"
import { deleteCompanyImage, extractPathFromUrl } from "@/lib/storage-images"
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

  // 匿名化で URL が消える前に、ストレージ上の実ファイル (顔写真・履歴書) を
  // 控えておく。DB の参照だけ消すと公開 URL のまま残り続けていた。
  const [beforeUser, uploadedFiles] = await Promise.all([
    prisma.user
      .findUnique({
        where: { id: userId },
        select: { avatarUrl: true, lineUserId: true },
      })
      .catch(() => null),
    prisma.uploadedFile
      .findMany({ where: { userId }, select: { fileUrl: true } })
      .catch(() => []),
  ])

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
          avatarUrl: null,
          // LINE 連携を外す。残すと再登録後の LINE ログインが
          // この退会済み行に当たって拒否され続ける。
          lineUserId: null,
          profilePublic: false,
          passwordHash: null,
          verificationToken: null,
          resetToken: null,
          // 失効しているが念のため期限切れに
          verificationTokenExpiry: null,
          resetTokenExpiry: null,
        },
      })
    })
  } catch (e) {
    console.error("[delete-account] failed:", e)
    return Response.json(
      { error: "退会処理に失敗しました。時間を置いて再度お試しください。" },
      { status: 500 }
    )
  }

  // 退会後に通知が来ても困るので関連レコードを削除する。
  // 匿名化のトランザクションとは分けて実行する: 以前は同じトランザクション内で
  // 各削除を .catch で握りつぶしていたが、Postgres は 1 文でも失敗すると
  // トランザクション全体が中断状態になり COMMIT も無効になる。その結果、匿名化が
  // 巻き戻ったのに「退会完了」を返し、ファイルだけ消してしまう恐れがあった。
  // 本番 DB に未作成のテーブルがあっても退会自体は成立させる。
  const cleanups: Array<[string, () => Promise<unknown>]> = [
    ["savedSearch", () => prisma.savedSearch.deleteMany({ where: { userId } })],
    ["jobFavorite", () => prisma.jobFavorite.deleteMany({ where: { userId } })],
    ["notification", () => prisma.notification.deleteMany({ where: { userId } })],
    // メッセージテンプレートはユーザー固有の PII を含むため削除
    [
      "applicationMessageTemplate",
      () => prisma.applicationMessageTemplate.deleteMany({ where: { userId } }),
    ],
    ["companyFollow", () => prisma.companyFollow.deleteMany({ where: { userId } })],
    ["resume", () => prisma.resume.deleteMany({ where: { userId } })],
    ["uploadedFile", () => prisma.uploadedFile.deleteMany({ where: { userId } })],
    // 「気になる」は企業の管理画面に表示され続けるため削除
    ["jobInterest", () => prisma.jobInterest.deleteMany({ where: { userId } })],
  ]
  // LINE 連携時に作られる line_leads の行は users.line_user_id を外しても残り、
  // 運営の一斉配信 (line_leads.line_user_id 宛て) が退会後も届き続けていた。
  //  - 応募に紐づかない連携だけの行 (follower) は削除
  //  - 応募の記録は企業側の履歴として残すが、配信は止める
  const lineUserId = beforeUser?.lineUserId
  if (lineUserId) {
    cleanups.push(
      [
        "lineLead(follower)",
        () =>
          prisma.lineLead.deleteMany({
            where: { lineUserId, status: "follower", jobId: null },
          }),
      ],
      [
        "lineLead(optOut)",
        () =>
          prisma.lineLead.updateMany({
            where: { lineUserId, optedOut: false },
            data: {
              optedOut: true,
              optedOutAt: new Date(),
              optedOutSource: "account_deleted",
            },
          }),
      ]
    )
  }
  for (const [label, run] of cleanups) {
    await run().catch((e) => {
      console.error(`[delete-account] cleanup failed (${label}):`, e)
    })
  }

  // ストレージの実体を削除 (失敗しても退会自体は成立させる)
  try {
    const avatarPath = beforeUser?.avatarUrl
      ? extractPathFromUrl(beforeUser.avatarUrl)
      : null
    await Promise.all([
      avatarPath ? deleteCompanyImage(avatarPath) : null,
      ...uploadedFiles.map((f) => deleteFileByUrl(f.fileUrl)),
    ])
  } catch (e) {
    console.warn("[delete-account] storage cleanup failed:", e)
  }

  // NextAuth セッション Cookie をクリア（クライアント側 signOut で確実に）
  return Response.json({ ok: true })
}
