import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const articleUpdateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "slugは小文字英数字とハイフンのみ使用できます")
    .optional(),
  title: z.string().min(1).max(200).optional(),
  excerpt: z.string().max(500).nullable().optional(),
  body: z.string().min(1).optional(),
  category: z.string().min(1).max(50).optional(),
  tags: z.array(z.string()).optional(),
  imageUrl: z.string().url().max(500).nullable().optional().or(z.literal("")),
  metaDescription: z.string().max(300).nullable().optional(),
  authorName: z.string().max(100).optional(),
  status: z.enum(["draft", "published"]).optional(),
  featured: z.boolean().optional(),
  publishedAt: z.string().datetime().nullable().optional().or(z.literal("")),
})

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) {
    return Response.json({ error: "記事が見つかりません" }, { status: 404 })
  }

  return Response.json({ article })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.article.findUnique({ where: { id } })
  if (!existing) {
    return Response.json({ error: "記事が見つかりません" }, { status: 404 })
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

  const parsed = articleUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const d = parsed.data

  // slug 変更時は重複チェック
  if (d.slug && d.slug !== existing.slug) {
    const conflict = await prisma.article.findUnique({ where: { slug: d.slug } })
    if (conflict) {
      return Response.json(
        { error: `slug "${d.slug}" はすでに使われています` },
        { status: 409 }
      )
    }
  }

  const empty = (v: string | null | undefined) => (v && v.length > 0 ? v : null)
  const nextStatus = d.status ?? existing.status

  // 下書き → 公開 に切り替わる場合、publishedAt が無ければ現在時刻を入れる
  let nextPublishedAt: Date | null | undefined = undefined
  if (d.publishedAt !== undefined) {
    nextPublishedAt =
      d.publishedAt && d.publishedAt.length > 0 ? new Date(d.publishedAt) : null
  } else if (
    existing.status === "draft" &&
    nextStatus === "published" &&
    !existing.publishedAt
  ) {
    nextPublishedAt = new Date()
  }

  const article = await prisma.article.update({
    where: { id },
    data: {
      ...(d.slug !== undefined ? { slug: d.slug } : {}),
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.excerpt !== undefined ? { excerpt: empty(d.excerpt) } : {}),
      ...(d.body !== undefined ? { body: d.body } : {}),
      ...(d.category !== undefined ? { category: d.category } : {}),
      ...(d.tags !== undefined ? { tags: d.tags } : {}),
      ...(d.imageUrl !== undefined ? { imageUrl: empty(d.imageUrl) } : {}),
      ...(d.metaDescription !== undefined
        ? { metaDescription: empty(d.metaDescription) }
        : {}),
      ...(d.authorName !== undefined ? { authorName: d.authorName } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.featured !== undefined ? { featured: d.featured } : {}),
      ...(nextPublishedAt !== undefined ? { publishedAt: nextPublishedAt } : {}),
    },
  })

  return Response.json({ article })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params
  const existing = await prisma.article.findUnique({ where: { id } })
  if (!existing) {
    return Response.json({ error: "記事が見つかりません" }, { status: 404 })
  }

  await prisma.article.delete({ where: { id } })
  return Response.json({ success: true })
}
