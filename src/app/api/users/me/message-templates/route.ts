/**
 * GET  /api/users/me/message-templates — 一覧
 * POST                                  — 新規作成（1 ユーザー 10 件まで）
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  name: z.string().min(1).max(60),
  body: z.string().min(1).max(2000),
  sortOrder: z.number().int().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const items = await prisma.applicationMessageTemplate
    .findMany({
      where: { userId: session.user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })
    .catch(() => [])
  return Response.json({ items })
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

  const count = await prisma.applicationMessageTemplate
    .count({ where: { userId: session.user.id } })
    .catch(() => 0)
  if (count >= 10) {
    return Response.json(
      { error: "テンプレートは 10 件までです。不要なものを削除してください。" },
      { status: 400 }
    )
  }

  const created = await prisma.applicationMessageTemplate.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      body: parsed.data.body,
      sortOrder: parsed.data.sortOrder ?? 100,
    },
  })
  return Response.json({ template: created }, { status: 201 })
}
