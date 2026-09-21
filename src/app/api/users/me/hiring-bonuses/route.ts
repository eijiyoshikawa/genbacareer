/**
 * 15.6 採用決定ボーナス申請。
 *
 * POST /api/users/me/hiring-bonuses
 * - 自分の status=hired な Application に対して 1 件だけ申請可能
 * - 重複申請は 409
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { HIRING_BONUS_AMOUNT } from "@/lib/hiring-bonus"
import { isPlanActive, isPlanEligibleForBonus } from "@/lib/plans"

export const dynamic = "force-dynamic"

const schema = z.object({
  applicationId: z.string().uuid(),
  payoutMethod: z.enum(["amazon_gift", "bank_transfer", "cash"]),
  payoutDetails: z.record(z.string(), z.string()).optional(),
  requestNote: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "入力エラー" }, { status: 400 })
  }

  // 該当 Application が自分のもので status=hired かを検証
  const app = await prisma.application.findFirst({
    where: {
      id: parsed.data.applicationId,
      userId: session.user.id,
      status: "hired",
    },
    select: {
      id: true,
      companyId: true,
      company: { select: { planType: true, planPaidUntil: true } },
    },
  })
  if (!app) {
    return Response.json(
      { error: "採用決定済みの応募が見つかりません" },
      { status: 404 }
    )
  }
  if (!app.companyId) {
    return Response.json(
      { error: "応募データに企業情報が紐付いていません" },
      { status: 400 }
    )
  }

  // C5: 採用ボーナスは月額プラン / SNS 枠の企業からの採用のみ対象
  if (!isPlanEligibleForBonus(app.company?.planType)) {
    return Response.json(
      {
        error:
          "この採用は採用ボーナスの対象外です (月額プラン または SNS 連携プラン企業の採用のみ対象)",
      },
      { status: 403 }
    )
  }
  // プランが期限切れの場合も対象外 (expire-plans cron は監査目的で
  // planType 自体は書き換えないため、planPaidUntil を併せて確認する)
  if (
    !isPlanActive({
      planType: app.company?.planType,
      planPaidUntil: app.company?.planPaidUntil,
    })
  ) {
    return Response.json(
      {
        error:
          "採用元企業のプランが期限切れのため、採用ボーナスの対象外です",
      },
      { status: 403 }
    )
  }

  // 重複申請チェック
  const existing = await prisma.hiringBonus.findUnique({
    where: { applicationId: app.id },
    select: { id: true },
  })
  if (existing) {
    return Response.json(
      { error: "この採用に対しては既に申請済みです" },
      { status: 409 }
    )
  }

  const created = await prisma.hiringBonus.create({
    data: {
      applicationId: app.id,
      userId: session.user.id,
      companyId: app.companyId,
      amount: HIRING_BONUS_AMOUNT,
      payoutMethod: parsed.data.payoutMethod,
      payoutDetails: parsed.data.payoutDetails ?? undefined,
      requestNote: parsed.data.requestNote ?? null,
    },
    select: { id: true, amount: true },
  })

  return Response.json({ ok: true, ...created }, { status: 201 })
}
