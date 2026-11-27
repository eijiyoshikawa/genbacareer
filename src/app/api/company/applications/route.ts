import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { getSuspendedCompanyError } from "@/lib/company-auth"

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

  // 運営が利用停止にした企業には応募者の氏名・連絡先を返さない
  // (書き出しと選考操作は停止済みだったが、一覧の取得だけ残っていた)
  const suspended = await getSuspendedCompanyError(companyId)
  if (suspended) {
    return Response.json({ error: suspended }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page = Math.min(10_000, Math.max(1, Math.trunc(Number(searchParams.get("page"))) || 1))
  const perPage = 20
  const status = searchParams.get("status")

  const where = {
    companyId,
    ...(status && status !== "all" ? { status } : {}),
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
