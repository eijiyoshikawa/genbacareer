import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { parseIntParam } from "@/lib/pagination"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role && role !== "seeker") {
    return Response.json(
      { error: "求職者アカウントでログインしてください" },
      { status: 403 }
    )
  }

  const searchParams = request.nextUrl.searchParams
  const page = parseIntParam(searchParams.get("page"), 1, 1)
  const limit = parseIntParam(searchParams.get("limit"), 20, 1, 50)

  const where = { userId: session.user.id }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            category: true,
            prefecture: true,
            city: true,
            salaryMin: true,
            salaryMax: true,
            salaryType: true,
            employmentType: true,
            status: true,
            company: {
              select: { id: true, name: true, logoUrl: true },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ])

  return Response.json({
    applications,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
