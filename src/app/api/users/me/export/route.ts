/**
 * GET /api/users/me/export
 *
 * 個人情報保護法 (APPI) 第 33 条 / GDPR 第 15 条 の「データ可搬性 / 開示請求」に
 * 対応する、ログイン中ユーザーの保有データを JSON でダウンロードできるエンドポイント。
 *
 * 含まれる情報:
 *   - プロフィール基本情報 (passwordHash 除く)
 *   - 応募履歴 / お気に入り / 保存検索 / フォロー企業
 *   - 受信スカウト / メッセージテンプレート
 *   - 通知履歴
 *
 * 大量取得による濫用を防ぐため 1 日 5 回 / IP までに制限。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインしてください" }, { status: 401 })
  }

  // 1 日 5 回 / IP まで（濫用防止）
  const rl = checkRateLimit({
    key: `data-export:${getClientIp(request)}`,
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const userId = session.user.id

  // 各テーブルから自分のデータを並列取得
  const [
    user,
    applications,
    favorites,
    savedSearches,
    notifications,
    companyFollows,
    messageTemplates,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        prefecture: true,
        city: true,
        birthDate: true,
        desiredCategories: true,
        desiredSalaryMin: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        // passwordHash / resetToken 等は除外
      },
    }),
    prisma.application.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        createdAt: true,
        message: true,
        job: { select: { id: true, title: true, prefecture: true } },
      },
    }),
    prisma.jobFavorite.findMany({
      where: { userId },
      select: {
        createdAt: true,
        job: { select: { id: true, title: true } },
      },
    }),
    prisma.savedSearch.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        q: true,
        prefecture: true,
        category: true,
        employmentType: true,
        salaryMin: true,
        tags: true,
        alertEnabled: true,
        createdAt: true,
      },
    }),
    prisma.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        readAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    }),
    prisma.companyFollow.findMany({
      where: { userId },
      select: {
        createdAt: true,
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.applicationMessageTemplate.findMany({
      where: { userId },
      select: { id: true, name: true, body: true, createdAt: true },
    }),
  ])

  const exportData = {
    exportedAt: new Date().toISOString(),
    legalBasis:
      "個人情報保護法 第 33 条（開示請求）/ GDPR 第 15 条（アクセス権）",
    note:
      "本ファイルはあなたが当サイトに登録した個人データの全てを含みます。第三者と共有しないようご注意ください。",
    user,
    applications,
    favorites,
    savedSearches,
    notifications,
    companyFollows,
    messageTemplates,
  }

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="genbacareer-data-export-${Date.now()}.json"`,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  })
}
