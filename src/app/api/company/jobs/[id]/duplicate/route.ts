/**
 * POST /api/company/jobs/[id]/duplicate
 *
 * 既存の求人を雛形に、下書き状態の新規求人を作成。
 * - title に "（複製）" を付与
 * - status は強制的に "draft"
 * - viewCount / publishedAt / rankScore はリセット
 * - 応募 / クリック / 閲覧履歴は引き継がない
 *
 * 承認済企業のみ。自社の求人のみ複製可能。
 */

import { type NextRequest } from "next/server"
import { requireCompanyAuth, isCompanyAuthError } from "@/lib/company-auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requireCompanyAuth({ requireApproved: true })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  const { id } = await params

  const original = await prisma.job
    .findUnique({ where: { id } })
    .catch(() => null)

  if (!original || original.companyId !== ctx.companyId) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  const created = await prisma.job.create({
    data: {
      companyId: ctx.companyId,
      source: "direct",
      // 「(複製)」サフィックス。既にあれば連番にしない（最小実装）
      title: `${original.title}（複製）`.slice(0, 500),
      category: original.category,
      subcategory: original.subcategory,
      employmentType: original.employmentType,
      description: original.description,
      requirements: original.requirements,
      salaryMin: original.salaryMin,
      salaryMax: original.salaryMax,
      salaryType: original.salaryType,
      prefecture: original.prefecture,
      city: original.city,
      address: original.address,
      benefits: original.benefits,
      tags: original.tags,
      videoUrls: original.videoUrls,
      status: "draft",
      publishedAt: null,
      expiresAt: null,
      viewCount: 0,
      rankScore: 0,
      // hellowork 拡張フィールドは複製対象外（参照系のため）
    },
  })

  return Response.json({ job: created }, { status: 201 })
}
