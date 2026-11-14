import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidateAfterJobChange } from "@/lib/revalidate-public"
import { computeDisplayPriority } from "@/lib/job-display-priority"
import { CATEGORIES } from "@/lib/categories"
import { isValidUuid } from "@/lib/uuid"

const VALID_CATEGORIES = CATEGORIES.map((c) => c.value) as readonly string[]

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
  videoUrls: z.array(z.string().url().max(500)).max(6).optional(),
  imageUrls: z.array(z.string().url().max(500)).max(12).optional(),
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
  if (!isValidUuid(id)) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

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
  const ctx = await getCompanySession()
  if (!ctx) {
    return Response.json({ error: "企業アカウントでログインしてください" }, { status: 401 })
  }

  const { id } = await params
  if (!isValidUuid(id)) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  const existing = await prisma.job.findUnique({
    where: { id },
    select: {
      companyId: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      source: true,
      salaryType: true,
      salaryMin: true,
      salaryMax: true,
      employmentType: true,
      workHours: true,
      workHoursNotes: true,
      holidays: true,
      annualHolidays: true,
      insurance: true,
      smokingPolicy: true,
      trialPeriod: true,
      description: true,
      prefecture: true,
    },
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

  // POST と同じカテゴリ制約 (建設業 9 カテゴリ固定)。PUT だけ素通しだと
  // 無効カテゴリが保存され、公開一覧から黙って消える。
  if (data.category !== undefined && !VALID_CATEGORIES.includes(data.category)) {
    return Response.json(
      { error: `無効なカテゴリです。有効な値: ${VALID_CATEGORIES.join(", ")}` },
      { status: 400 }
    )
  }

  // 公開 (active 化) は承認済み企業のみ。POST / 複製と同条件にし、
  // 審査中・否認済み企業が既存の下書きを PUT で公開できないようにする。
  if (data.status === "active" && existing.status !== "active") {
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { status: true },
    })
    if (company?.status !== "approved") {
      return Response.json(
        { error: "企業アカウントの審査が完了するまで求人を公開できません" },
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

  // 編集後の値で displayPriority を再計算（賃金タイプや明示項目の変更を反映）
  const merged = {
    source: existing.source,
    salaryType: data.salaryType !== undefined ? data.salaryType : existing.salaryType,
    salaryMin: data.salaryMin !== undefined ? data.salaryMin : existing.salaryMin,
    salaryMax: data.salaryMax !== undefined ? data.salaryMax : existing.salaryMax,
    employmentType:
      data.employmentType !== undefined ? data.employmentType : existing.employmentType,
    workHours: existing.workHours,
    workHoursNotes: existing.workHoursNotes,
    holidays: existing.holidays,
    annualHolidays: existing.annualHolidays,
    insurance: existing.insurance,
    smokingPolicy: existing.smokingPolicy,
    trialPeriod: existing.trialPeriod,
    description: data.description !== undefined ? data.description : existing.description,
    prefecture: data.prefecture !== undefined ? data.prefecture : existing.prefecture,
  }
  const displayPriority = computeDisplayPriority(merged)

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...data,
      ...(publishedAt ? { publishedAt } : {}),
      displayPriority,
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

  // 公開中の求人に変更があった、または初回公開された場合のみ public ページを再生成。
  // draft 編集の度に revalidate する必要は無いので、active なケースに限定する。
  const isNowActive = data.status === "active" || (!data.status && existing.status === "active")
  if (isNowActive || publishedAt) {
    revalidateAfterJobChange({ companyId: existing.companyId })
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
  if (!isValidUuid(id)) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  const existing = await prisma.job.findUnique({
    where: { id },
    select: { companyId: true, status: true },
  })
  if (!existing || existing.companyId !== ctx.companyId) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  // 応募が付いた求人を物理削除すると Application → BillingEvent まで cascade で
  // 消え、成果報酬の請求記録と応募者の履歴が失われる。応募がある場合は
  // 削除を拒否し、掲載終了 (closed) への変更を案内する。
  const applicationCount = await prisma.application.count({ where: { jobId: id } })
  if (applicationCount > 0) {
    return Response.json(
      {
        error:
          "応募のある求人は削除できません。掲載を止める場合はステータスを「掲載終了」に変更してください",
        code: "HAS_APPLICATIONS",
      },
      { status: 409 }
    )
  }

  await prisma.job.delete({ where: { id } })

  // 公開中だった求人の削除はトップ / 企業ページの一覧に影響するので再生成。
  if (existing.status === "active") {
    revalidateAfterJobChange({ companyId: existing.companyId })
  }

  return Response.json({ success: true })
}
