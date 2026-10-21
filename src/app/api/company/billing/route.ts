import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { parseIntParam } from "@/lib/pagination"
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
  const page = parseIntParam(searchParams.get("page"), 1, 1)
  const perPage = 20

  const [events, total, summary] = await Promise.all([
    prisma.billingEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        application: {
          include: {
            job: { select: { title: true } },
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.billingEvent.count({ where: { companyId } }),
    prisma.billingEvent.groupBy({
      by: ["status"],
      where: { companyId },
      _sum: { amount: true },
      _count: true,
    }),
  ])

  return Response.json({ events, total, page, perPage, summary })
}
