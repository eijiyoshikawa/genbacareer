import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { requireCompanyAuth, isCompanyAuthError } from "@/lib/company-auth"
import { isPlanActive } from "@/lib/plans"
import { parseVideoUrl } from "@/lib/video-embed"

// POST /api/company/jobs と同じ理由で YouTube/TikTok/Vimeo のみ許可する。
const videoUrlSchema = z
  .string()
  .url()
  .max(500)
  .refine((url) => parseVideoUrl(url) !== null, {
    message: "動画 URL は YouTube / TikTok / Vimeo のみ対応しています",
  })

const updateJobSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(50).optional(),
  subcategory: z.string().max(50).nullable().optional(),
  employmentType: z.enum(["full_time", "part_time", "contract"]).nullable().optional(),
  description: z.string().nullable().optional(),
  requirements: z.string().nullable().optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  salaryMax: z.number().int().min(0).nullable().optional(),
  salaryType: z.enum(["monthly", "hourly", "annual"]).nullable().optional(),
  prefecture: z.string().min(1).max(10).optional(),
  city: z.string().max(50).nullable().optional(),
  address: z.string().nullable().optional(),
  benefits: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  videoUrls: z.array(videoUrlSchema).max(6).optional(),
  status: z.enum(["draft", "active", "closed"]).optional(),
  /**
   * 楽観ロック用 ISO timestamp。GET で取得した updatedAt をそのまま PUT に
   * 渡すと、別タブ / 別ユーザーが同じレコードを編集した場合に競合検出して
   * 409 を返す（強制上書きを防ぐ）。
   */
  expectedUpdatedAt: z.string().datetime().optional(),
})

async function getCompanySession() {
  const session = await auth()
  if (!session?.user) return null

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") return null

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) return null

  return { companyId }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCompanySession()
  if (!ctx) {
    return Response.json({ error: "企業アカウントでログインしてください" }, { status: 401 })
  }

  const { id } = await params

  const job = await prisma.job.findUnique({ where: { id } })
  if (!job || job.companyId !== ctx.companyId) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  return Response.json({ job })
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 求人の編集・公開（draft→active）は status=approved の企業のみ許可
  // （POST と同じ基準。ここが緩いと却下・停止済みの企業が既存求人を
  // 編集し続けたり再公開したりできてしまう）。
  const ctx = await requireCompanyAuth({ requireApproved: true })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  const { id } = await params

  const existing = await prisma.job.findUnique({
    where: { id },
    select: { companyId: true, status: true, publishedAt: true, updatedAt: true },
  })
  if (!existing || existing.companyId !== ctx.companyId) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = updateJobSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { expectedUpdatedAt, ...data } = parsed.data

  // 公開（active への変更）にはプランが有効である必要がある（月額プラン等の
  // 期限切れは不可）。既に active な求人の本文編集など、status を active の
  // まま送らないケースは対象外（それらは PUT の requireApproved で担保）。
  if (data.status === "active") {
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { planType: true, planPaidUntil: true },
    })
    if (!company || !isPlanActive(company)) {
      return Response.json(
        {
          error:
            "掲載プランの有効期限が切れているため公開できません。プランの更新については運営までお問い合わせください。",
        },
        { status: 403 }
      )
    }
  }

  // 楽観ロック: クライアントが取得した時点から変わっていなければ更新を許可
  if (expectedUpdatedAt) {
    const expected = new Date(expectedUpdatedAt).getTime()
    const actual = existing.updatedAt.getTime()
    if (Math.abs(actual - expected) > 1000) {
      // 1 秒以上ズレていたら別の編集が入った可能性
      return Response.json(
        {
          error: "他の編集が反映されています。最新の内容を読み込み直してから保存してください",
          code: "STALE_UPDATE",
          currentUpdatedAt: existing.updatedAt.toISOString(),
        },
        { status: 409 }
      )
    }
  }

  // Set publishedAt when first publishing
  const publishedAt =
    data.status === "active" && !existing.publishedAt
      ? new Date()
      : undefined

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...data,
      ...(publishedAt ? { publishedAt } : {}),
    },
  })

  // GbizINFO リマインダー: draft → active への初回公開で法人番号未登録なら
  // 観測ログ。UI バナーで既に注意喚起しているため、ここでは記録のみ。
  if (publishedAt) {
    const company = await prisma.company.findUnique({
      where: { id: existing.companyId ?? "" },
      select: { corporateNumber: true, name: true },
    })
    if (company && !company.corporateNumber) {
      console.info(
        `[gbiz-reminder] job published without corporateNumber: companyId=${existing.companyId} name=${company.name} jobId=${id}`
      )
    }
  }

  return Response.json({ job })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCompanySession()
  if (!ctx) {
    return Response.json({ error: "企業アカウントでログインしてください" }, { status: 401 })
  }

  const { id } = await params

  const existing = await prisma.job.findUnique({
    where: { id },
    select: { companyId: true },
  })
  if (!existing || existing.companyId !== ctx.companyId) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  // Job を削除すると Application (onDelete: Cascade) 経由で BillingEvent /
  // EarlyResignation / HiringBonus まで連鎖削除され、成果報酬請求・返金・
  // 祝い金の記録が完全に失われてしまう（財務・監査上復元不可）。
  // 応募が 1 件でもある求人は物理削除せず、募集終了（status=closed）に
  // 誘導する。
  const applicationCount = await prisma.application.count({ where: { jobId: id } })
  if (applicationCount > 0) {
    return Response.json(
      {
        error:
          "応募履歴のある求人は削除できません。募集を終了する場合はステータスを「closed」に変更してください。",
      },
      { status: 409 }
    )
  }

  await prisma.job.delete({ where: { id } })

  return Response.json({ success: true })
}
