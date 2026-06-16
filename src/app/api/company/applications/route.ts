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

  const VALID_APPLICATION_STATUSES = ["applied", "reviewing", "interview", "offered", "hired", "rejected"]

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const perPage = 20
  const statusParam = searchParams.get("status")
  const status =
    statusParam && statusParam !== "all" && VALID_APPLICATION_STATUSES.includes(statusParam)
      ? statusParam
      : null

  const where = {
    companyId,
    ...(status ? { status } : {}),
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        job: { select: { id: true, title: true } },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            prefecture: true,
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ])

  return Response.json({ applications, total, page, perPage })
}
