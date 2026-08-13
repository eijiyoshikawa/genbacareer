/**
 * PATCH /api/admin/jobs/[id]/hiring-fee
 *
 * 管理者が求人ごとの成果報酬単価を設定する。
 * 認証: admin ロールのセッション必須。
 *
 * Body:
 *   { hiringFeeAmount: number | null }
 *   - 498,000 〜 2,000,000 の整数、または null（NULL でフォールバックさせる）
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { HIRING_FEE_MIN, HIRING_FEE_MAX } from "@/lib/hiring-fee"

const bodySchema = z.object({
  hiringFeeAmount: z
    .union([
      z
        .number()
        .int()
        .min(HIRING_FEE_MIN, `${HIRING_FEE_MIN.toLocaleString()} 円以上で入力してください`)
        .max(HIRING_FEE_MAX, `${HIRING_FEE_MAX.toLocaleString()} 円以下で入力してください`),
      z.null(),
    ]),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return Response.json({ error: "Bad Request" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    )
  }

  try {
    const job = await prisma.job.update({
      where: { id },
      data: { hiringFeeAmount: parsed.data.hiringFeeAmount },
      select: { id: true, hiringFeeAmount: true },
    })
    return Response.json({ ok: true, job })
  } catch (e) {
    console.error(`[admin/jobs/hiring-fee] failed for ${id}:`, e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 },
    )
  }
}
