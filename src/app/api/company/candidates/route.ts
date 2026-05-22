import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "企業アカウントでログインしてください" }, { status: 403 })
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "企業情報が見つかりません" }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const prefecture = searchParams.get("prefecture")
  const category = searchParams.get("category")
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const perPage = 20

  const where = {
    profilePublic: true,
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
