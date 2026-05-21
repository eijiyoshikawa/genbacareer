import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const updateStatusSchema = z.object({
  status: z.enum([
    "applied",
    "reviewing",
    "interview",
    "offered",
    "hired",
    "rejected",
  ]),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params

  const application = await prisma.application.findUnique({
    where: { id },
    select: { companyId: true, status: true },
  })

  if (!application || application.companyId !== companyId) {
    return Response.json({ error: "応募が見つかりません" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "無効なステータスです", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const updated = await prisma.application.update({
    where: { id },
    data: { status: parsed.data.status },
  })

  // Trigger billing only when transitioning TO "hired" (not when already hired)
  if (parsed.data.status === "hired" && application.status !== "hired") {
    try {
      const { createHiringInvoice } = await import("@/lib/billing")
      await createHiringInvoice(id)
    } catch (error) {
      console.error(`[billing] Failed to create invoice for application ${id}:`, error)
      // Don't fail the status update if billing fails
    }
  }

  return Response.json({ application: updated })
}
