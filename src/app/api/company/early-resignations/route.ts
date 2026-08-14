/**
 * 企業: 早期退職を報告する。
 *
 * POST /api/company/early-resignations
 *   Body: {
 *     applicationId: UUID,
 *     resignedAt: ISO date string,
 *     companyNote?: string (max 2000)
 *   }
 *
 * 検証:
 *   - 該当 Application が自社のものか
 *   - status='hired' か
 *   - hiredAt が設定されているか
 *   - 既存の EarlyResignation が無いか (1 採用につき 1 件)
 *   - 退職日が入社日より後か
 *
 * 副作用:
 *   - EarlyResignation を作成 (status='reported')
 *   - 自動で返金額計算 (1m:80% / 2m:50% / 3m:20% / 4m+:0%)
 *   - 4 ヶ月以降の場合は 400 で拒否 (eligible=false)
 *   - admin に通知 (Notification は将来対応、今は admin がダッシュボードで確認)
 *
 * GET /api/company/early-resignations
 *   自社の戻入申請履歴を新しい順
 */

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  computeRefundParams,
  isEligibleForRefund,
  parseResignedAt,
} from "@/lib/early-resignation"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SessionUser = {
  id?: string
  companyId?: string
  role?: string
}

async function requireCompanyUser() {
  const session = await auth()
  if (!session?.user) return null
  const u = session.user as SessionUser
  if (!u.companyId) return null
  if (u.role !== "company_admin" && u.role !== "company_member") return null
  return { userId: u.id ?? null, companyId: u.companyId }
}

const reportSchema = z.object({
  applicationId: z.uuid(),
  resignedAt: z.iso.datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  companyNote: z.string().max(2000).optional(),
})

export async function POST(request: Request) {
  const me = await requireCompanyUser()
  if (!me) {
    return Response.json({ error: "認証が必要です" }, { status: 401 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: "JSON が不正です" }, { status: 400 })
  }

  const parsed = reportSchema.safeParse(raw)
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

  const { applicationId, resignedAt: resignedAtStr, companyNote } = parsed.data
  const resignedAt = parseResignedAt(resignedAtStr)

  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      companyId: true,
      jobId: true,
      userId: true,
      status: true,
      hiredAt: true,
      billingEvent: { select: { amount: true } },
      earlyResignation: { select: { id: true } },
    },
  })

  if (!app || app.companyId !== me.companyId) {
    return Response.json({ error: "応募が見つかりません" }, { status: 404 })
  }
  if (app.status !== "hired") {
    return Response.json(
      { error: "採用確定 (hired) の応募のみが対象です" },
      { status: 400 },
    )
  }
  if (!app.hiredAt) {
    return Response.json(
      { error: "採用日 (hiredAt) が記録されていません。admin にお問い合わせください" },
      { status: 400 },
    )
  }
  if (resignedAt <= app.hiredAt) {
    return Response.json(
      { error: "退職日は入社日より後である必要があります" },
      { status: 400 },
    )
  }
  if (app.earlyResignation) {
    return Response.json(
      { error: "この採用についてはすでに戻入申請が登録されています" },
      { status: 409 },
    )
  }

  const originalFeeAmount = app.billingEvent?.amount ?? 0
  if (originalFeeAmount <= 0) {
    return Response.json(
      {
        error:
          "成果報酬の請求記録 (BillingEvent) が見つかりません。admin にお問い合わせください",
      },
      { status: 400 },
    )
  }

  const { monthsAfterHire, refundRate, refundAmount, eligible } =
    computeRefundParams({
      hiredAt: app.hiredAt,
      resignedAt,
      originalFeeAmount,
    })

  if (!eligible) {
    return Response.json(
      {
        error: `入社後 ${monthsAfterHire} ヶ月経過のため戻入対象外です (3 ヶ月以内が対象)`,
        monthsAfterHire,
      },
      { status: 400 },
    )
  }

  const created = await prisma.earlyResignation.create({
    data: {
      applicationId: app.id,
      companyId: me.companyId,
      jobId: app.jobId,
      userId: app.userId,
      hiredAt: app.hiredAt,
      resignedAt,
      monthsAfterHire,
      refundRate,
      refundAmount,
      originalFeeAmount,
      status: "reported",
      companyNote: companyNote ?? null,
      reportedBy: me.userId,
    },
    select: {
      id: true,
      refundRate: true,
      refundAmount: true,
      monthsAfterHire: true,
    },
  })

  return Response.json({ ok: true, ...created }, { status: 201 })
}

export async function GET() {
  const me = await requireCompanyUser()
  if (!me) {
    return Response.json({ error: "認証が必要です" }, { status: 401 })
  }

  const rows = await prisma.earlyResignation.findMany({
    where: { companyId: me.companyId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      applicationId: true,
      resignedAt: true,
      hiredAt: true,
      monthsAfterHire: true,
      refundRate: true,
      refundAmount: true,
      originalFeeAmount: true,
      status: true,
      adminNote: true,
      invoicedAt: true,
      createdAt: true,
      user: { select: { name: true } },
      job: { select: { title: true } },
    },
  })

  return Response.json({ rows })
}

export { isEligibleForRefund }
