/**
 * POST /api/admin/blocklists - 除外キーワード追加 (8.1)
 *
 * admin 専用。重複キーワード (same scope) は 409。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isValidUuid } from "@/lib/uuid"

export const dynamic = "force-dynamic"

const schema = z.object({
  keyword: z.string().trim().min(1).max(100),
  scope: z.enum(["any", "title", "description", "company"]).default("any"),
  note: z.string().max(500).nullable().optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }
  const rawUserId = (session?.user as { id?: string } | undefined)?.id

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  // 同じ keyword + scope の組合せの重複チェック
  const existing = await prisma.blocklist.findFirst({
    where: { keyword: parsed.data.keyword, scope: parsed.data.scope },
    select: { id: true },
  })
  if (existing) {
    return Response.json(
      { error: "同じキーワード・対象の組合せが既に登録されています" },
      { status: 409 }
    )
  }

  const created = await prisma.blocklist.create({
    data: {
      keyword: parsed.data.keyword,
      scope: parsed.data.scope,
      note: parsed.data.note ?? null,
      // 環境変数ベースの管理者ログイン (id: "admin" 固定) は UUID でないため、
      // そのまま渡すと @db.Uuid 列で P2023 になる。
      createdBy: isValidUuid(rawUserId) ? rawUserId : null,
    },
    select: { id: true },
  })

  return Response.json({ id: created.id }, { status: 201 })
}
