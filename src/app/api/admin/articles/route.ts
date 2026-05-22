import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const articleCreateSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "slugは小文字英数字とハイフンのみ使用できます"),
  title: z.string().min(1).max(200),
  excerpt: z.string().max(500).nullable().optional(),
  body: z.string().min(1),
  category: z.string().min(1).max(50),
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

export async function GET(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const perPage = 20
  const status = searchParams.get("status") ?? ""
  const category = searchParams.get("category") ?? ""
  const query = searchParams.get("q") ?? ""

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        status: true,
        featured: true,
        publishedAt: true,
        viewCount: true,
        updatedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ])

  return Response.json({ articles, total, page, perPage })
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
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

  const parsed = articleCreateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const d = parsed.data

  // slug の重複チェック
  const existing = await prisma.article.findUnique({
    where: { slug: d.slug },
  })
  if (existing) {
    return Response.json(
      { error: `slug "${d.slug}" はすでに使われています` },
      { status: 409 }
    )
  }

  const empty = (v: string | null | undefined) => (v && v.length > 0 ? v : null)
  const status = d.status ?? "draft"

  const article = await prisma.article.create({
    data: {
      slug: d.slug,
      title: d.title,
      excerpt: empty(d.excerpt),
      body: d.body,
      category: d.category,
      tags: d.tags ?? [],
      imageUrl: empty(d.imageUrl),
      metaDescription: empty(d.metaDescription),
      authorName: d.authorName && d.authorName.length > 0 ? d.authorName : "ゲンバキャリア編集部",
      status,
      featured: d.featured ?? false,
      publishedAt:
        status === "published"
          ? d.publishedAt && d.publishedAt.length > 0
            ? new Date(d.publishedAt)
            : new Date()
          : null,
    },
  })

  return Response.json({ article }, { status: 201 })
}
