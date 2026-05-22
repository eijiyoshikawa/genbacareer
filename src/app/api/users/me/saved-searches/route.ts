/**
 * GET /api/users/me/saved-searches — 自分の保存検索一覧
 * POST                              — 保存検索を新規作成
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  name: z.string().min(1).max(100),
  q: z.string().max(200).nullable().optional(),
  prefecture: z.string().max(20).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
  employmentType: z.string().max(20).nullable().optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  source: z.enum(["direct", "hellowork"]).nullable().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  excludeKeywords: z.array(z.string().min(1).max(50)).max(20).optional(),
  alertEnabled: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const items = await prisma.savedSearch
    .findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
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

  // 1 ユーザーあたり上限 30 件
  const count = await prisma.savedSearch
    .count({ where: { userId: session.user.id } })
    .catch(() => 0)
  if (count >= 30) {
    return Response.json(
      { error: "保存検索は 30 件までです。不要なものを削除してください。" },
      { status: 400 }
    )
  }

  const saved = await prisma.savedSearch.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      q: parsed.data.q ?? null,
      prefecture: parsed.data.prefecture ?? null,
      city: parsed.data.city ?? null,
      category: parsed.data.category ?? null,
      employmentType: parsed.data.employmentType ?? null,
      salaryMin: parsed.data.salaryMin ?? null,
      source: parsed.data.source ?? null,
      tags: parsed.data.tags ?? [],
      excludeKeywords: parsed.data.excludeKeywords ?? [],
      alertEnabled: parsed.data.alertEnabled ?? true,
    },
  })

  return Response.json({ savedSearch: saved }, { status: 201 })
}
