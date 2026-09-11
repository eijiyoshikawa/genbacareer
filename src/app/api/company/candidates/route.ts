/**
 * GET /api/company/candidates — 求職者候補検索（企業向け）
 *
 * 以前は下記の不備があった:
 *  - 承認待ち/却下済み企業でもログインさえしていれば候補者一覧を閲覧できた
 *    （求人投稿・スカウト送信は requireApproved で守られていたが、この
 *    エンドポイントだけ独自の緩い認証チェックになっていた）
 *  - blockedCompanyIds（求職者が明示的にブロックした企業）を一切見ておらず、
 *    自社をブロックした求職者もそのまま一覧に出てしまっていた
 *    （scouts.ts のコメントは「候補者一覧では既に反映済み」と誤って記載
 *    していたが、実際には反映されていなかった）
 *  - ページネーションに上限/レート制限が無く、公開プロフィール全件を
 *    企業が際限なくスクレイピングできた
 */

import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireCompanyAuth, isCompanyAuthError } from "@/lib/company-auth"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

const MAX_PAGE = 500

export async function GET(request: NextRequest) {
  const ctx = await requireCompanyAuth({ requireApproved: true })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  const rl = checkRateLimit({
    key: `candidates-browse:${ctx.companyId}`,
    limit: 200,
    windowMs: 60 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const { searchParams } = request.nextUrl
  const prefecture = searchParams.get("prefecture")
  const category = searchParams.get("category")
  const page = Math.min(MAX_PAGE, Math.max(1, Number(searchParams.get("page")) || 1))
  const perPage = 20

  const where = {
    profilePublic: true,
    // 求職者が自社をブロックしている場合は除外する
    NOT: { blockedCompanyIds: { has: ctx.companyId } },
    ...(prefecture ? { prefecture } : {}),
    ...(category ? { desiredCategories: { has: category } } : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        prefecture: true,
        city: true,
        desiredCategories: true,
        desiredSalaryMin: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  return Response.json({ candidates: users, total, page, perPage })
}
