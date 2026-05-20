import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const schema = z.object({
  jobId: z.string().uuid(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const searchParams = request.nextUrl.searchParams
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")))

  const where = { userId: session.user.id }

  const [favorites, total] = await Promise.all([
    prisma.favorite.findMany({
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
            company: { select: { id: true, name: true, logoUrl: true } },
          },
        },
      },
    }),
    prisma.favorite.count({ where }),
  ])

  return Response.json({
    favorites,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります" },
      { status: 400 }
    )
  }

  const job = await prisma.job.findUnique({
    where: { id: parsed.data.jobId },
    select: { id: true },
  })
  if (!job) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  const favorite = await prisma.favorite.upsert({
    where: {
      userId_jobId: {
        userId: session.user.id,
        jobId: parsed.data.jobId,
      },
    },
    create: {
      userId: session.user.id,
      jobId: parsed.data.jobId,
    },
    update: {},
  })

  return Response.json({ favorite }, { status: 201 })
}
