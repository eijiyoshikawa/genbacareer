/**
 * 管理者専用: 企業の掲載プランを変更する。
 *
 * POST /api/admin/companies/[id]/plan
 *   Body: {
 *     planType: PlanType,
 *     planPaidUntil: ISO string | null,  // monthly/sns_client は必須
 *     planActivatedAt: ISO string | null,
 *     planPrepaidFull: boolean,
 *     planNotes: string | null
 *   }
 *
 * 副作用:
 *   - Company.planTier を planType に応じて再計算 (denormalized cache)
 *   - planActivatedAt が null の場合、新規 / 異なる planType への変更時は now() を入れる
 *   - planExpiryNotifiedAt は null にリセット (通知再送を許可)
 */

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { PLAN_TYPES, isPlanActive, planTier } from "@/lib/plans"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const schema = z.object({
  planType: z.enum(PLAN_TYPES),
  planPaidUntil: z.iso.datetime().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  planActivatedAt: z.iso.datetime().nullable().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  planPrepaidFull: z.boolean(),
  planNotes: z.string().max(500).nullable(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return { userId: (session.user as { id?: string }).id ?? null }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireAdmin()
  if (!me) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: "JSON が不正です" }, { status: 400 })
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return Response.json(
      {
        error: "入力エラー",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }

  const { planType, planPaidUntil, planActivatedAt, planPrepaidFull, planNotes } =
    parsed.data

  // 月額 / SNS は paidUntil 必須
  if (
    (planType === "monthly_12" ||
      planType === "monthly_24" ||
      planType === "sns_client") &&
    !planPaidUntil
  ) {
    return Response.json(
      { error: "月額プラン / SNS プランは契約終了日が必須です" },
      { status: 400 },
    )
  }

  const company = await prisma.company.findUnique({
    where: { id },
    select: {
      id: true,
      planType: true,
      planActivatedAt: true,
      planPaidUntil: true,
      source: true,
    },
  })
  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  // HelloWork 取り込み企業はプラン変更不可 (参照データのため)
  if (company.source === "hellowork") {
    return Response.json(
      { error: "HelloWork 取り込み企業はプラン管理対象外です" },
      { status: 400 },
    )
  }

  // planActivatedAt が未指定 + planType 変更時は now() を入れる
  let activatedAt: Date | null = planActivatedAt ? new Date(planActivatedAt) : null
  if (!activatedAt) {
    if (company.planType !== planType) {
      activatedAt = new Date()
    } else {
      activatedAt = company.planActivatedAt
    }
  }

  // 期限通知の再送フラグは、プラン種別か終了日が変わったときだけ戻す。
  // メモだけの保存でも毎回戻していたため、翌日に同じ期限通知メールが再送されていた。
  const nextPaidUntil = parsePaidUntil(planPaidUntil)
  const planChanged =
    company.planType !== planType ||
    (company.planPaidUntil?.getTime() ?? null) !== (nextPaidUntil?.getTime() ?? null)

  await prisma.company.update({
    where: { id },
    data: {
      planType,
      planPaidUntil: nextPaidUntil,
      planActivatedAt: activatedAt,
      planPrepaidFull,
      planNotes,
      // 期限切れの月額 / SNS プランは expire-plans cron が planTier を 0 に落とす。
      // ここで無条件に再計算すると、メモだけ編集しても次の cron まで (最長 24 時間)
      // 有料枠の表示順位に戻ってしまう。
      planTier: isPlanActive({ planType, planPaidUntil: nextPaidUntil })
        ? planTier({ planType, source: company.source })
        : 0,
      ...(planChanged ? { planExpiryNotifiedAt: null } : {}),
    },
  })

  return Response.json({ ok: true })
}

/**
 * 契約終了日。フォームは YYYY-MM-DD を送るため、そのまま new Date() すると
 * UTC 0 時 (= JST 9 時) になり、最終日の朝 9 時にプランが失効していた。
 * 日付のみの入力は JST のその日の終わりとして扱う。
 */
function parsePaidUntil(value: string | null | undefined): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59.999+09:00`)
  }
  return new Date(value)
}
