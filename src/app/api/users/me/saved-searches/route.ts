import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  prefecture: z.string().max(10).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  employmentType: z.enum(["full_time", "part_time", "contract"]).nullable().optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  keyword: z.string().max(200).nullable().optional(),
  alertEnabled: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ searches })
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

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  // Cap per user
  const count = await prisma.savedSearch.count({
    where: { userId: session.user.id },
  })
  if (count >= 20) {
    return Response.json(
      { error: "保存できる検索条件は 20 件までです" },
      { status: 400 }
    )
  }

  const search = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      prefecture: parsed.data.prefecture ?? null,
      category: parsed.data.category ?? null,
      employmentType: parsed.data.employmentType ?? null,
      salaryMin: parsed.data.salaryMin ?? null,
      keyword: parsed.data.keyword ?? null,
      alertEnabled: parsed.data.alertEnabled ?? true,
    },
  })

  return Response.json({ search }, { status: 201 })
}
