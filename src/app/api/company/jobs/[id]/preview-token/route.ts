/**
 * POST   /api/company/jobs/[id]/preview-token — 新規生成 or ローテート
 * DELETE                                       — 無効化
 *
 * 企業ユーザー専用。自社の求人のみ操作可能。
 */

import { type NextRequest } from "next/server"
import { randomBytes } from "node:crypto"
import { requireCompanyAuth, isCompanyAuthError } from "@/lib/company-auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function generateToken(): string {
  return randomBytes(24).toString("hex") // 48 文字
}

async function assertOwnership(companyId: string, id: string) {
  const job = await prisma.job
    .findUnique({ where: { id }, select: { companyId: true } })
    .catch(() => null)
  return job && job.companyId === companyId
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompanyAuth({ requireApproved: true })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }
  const { id } = await params
  if (!(await assertOwnership(ctx.companyId, id))) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  const token = generateToken()
  await prisma.job.update({
    where: { id },
    data: { previewToken: token },
  })

  return Response.json({ token })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompanyAuth({ requireApproved: true })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }
  const { id } = await params
  if (!(await assertOwnership(ctx.companyId, id))) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  await prisma.job.update({
    where: { id },
    data: { previewToken: null },
  })
  return Response.json({ ok: true })
}
