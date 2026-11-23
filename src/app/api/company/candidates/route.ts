import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { requireCompanyAuth, isCompanyAuthError } from "@/lib/company-auth"
import { isScoutEnabled } from "@/lib/feature-flags"

export async function GET(request: NextRequest) {
  // 求職者プロフィールの一覧は、運営が承認した企業にのみ返す。
  // 自己登録しただけの未承認 (pending) / 却下企業に公開プロフィールを
  // 列挙させない。
  const ctx = await requireCompanyAuth({ requireApproved: true })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  // スカウト機能の解放前は候補者検索も閉じる (UI 側のゲートと揃える)
  if (!(await isScoutEnabled())) {
    return Response.json(
      { error: "スカウト機能は現在準備中です（近日公開予定）" },
      { status: 403 }
    )
  }

  const { searchParams } = request.nextUrl
  const prefecture = searchParams.get("prefecture")
  const category = searchParams.get("category")
  const page = Math.min(10_000, Math.max(1, Math.trunc(Number(searchParams.get("page"))) || 1))
  const perPage = 20

  const where = {
    profilePublic: true,
    // 凍結・退会済みユーザーは候補に出さない
    status: "active",
    // この企業をブロックした求職者は候補に出さない
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
