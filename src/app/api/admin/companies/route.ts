import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const companySchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(100).nullable().optional(),
  prefecture: z.string().max(10).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  address: z.string().nullable().optional(),
  employeeCount: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional().or(z.literal("")),
  websiteUrl: z.string().url().max(500).nullable().optional().or(z.literal("")),
  contactEmail: z.string().email().max(255).nullable().optional().or(z.literal("")),
})

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
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
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = companySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const d = parsed.data
  const empty = (v: string | null | undefined) => (v && v.length > 0 ? v : null)

  const company = await prisma.company.create({
    data: {
      name: d.name,
      industry: empty(d.industry),
      prefecture: empty(d.prefecture),
      city: empty(d.city),
      address: empty(d.address),
      employeeCount: empty(d.employeeCount),
      description: empty(d.description),
      logoUrl: empty(d.logoUrl),
      websiteUrl: empty(d.websiteUrl),
      contactEmail: empty(d.contactEmail),
    },
  })

  return Response.json({ company }, { status: 201 })
}
