import { prisma } from "./db"
import { resolveHiringFee } from "./hiring-fee"

/**
 * 採用確定時に成果報酬の請求書タスクを作成する。
 *
 * 2026-07 の方針変更 (RELEASE_TODO.md #9) により MoneyForward との自動連携は
 * 廃止し、請求書は担当者が /admin/billing-todo で案件ごとに手動発行する運用に
 * 統一された。ここでは pending の BillingEvent を作成するところまでを行い、
 * 発行 (pending → invoiced) / 入金確認 (invoiced → paid) は
 * /api/admin/billing-events/[id]/mark 経由で admin が手動更新する。
 *
 * (以前はここで MoneyForward API を自動呼び出ししていたが、本番では
 * MF_CLIENT_ID/SECRET が未設定のため必ず失敗して BillingEvent が pending を
 * 経由せず即 failed になり、admin の発行待ちリスト・日次サマリーの両方から
 * 対象が消えてしまう=請求漏れを起こしていたため削除した。)
 */
export async function createHiringInvoice(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      offerSalaryMin: true,
      offerSalaryMax: true,
      offerSalaryType: true,
      company: { select: { id: true } },
      job: {
        select: {
          hiringFeeAmount: true,
          salaryMin: true,
          salaryMax: true,
          salaryType: true,
        },
      },
    },
  })

  if (!application || !application.company) {
    throw new Error(`Application ${applicationId} not found or has no company`)
  }

  // Job 個別設定 (hiringFeeAmount) があればそれを使い、無ければ理論年収×35%で自動計算。
  // 給与情報は「offered」遷移時点の Application スナップショットを優先する
  // (無ければ求人の現在値にフォールバック — スナップショット導入前の古い応募向け)。
  // これは、企業が採用確定の直前に求人の給与を一時的に下げて成果報酬を圧縮し、
  // 請求後に元へ戻すという操作を防ぐため。
  const feeAmount = resolveHiringFee({
    hiringFeeAmount: application.job.hiringFeeAmount,
    salaryMin: application.offerSalaryMin ?? application.job.salaryMin,
    salaryMax: application.offerSalaryMax ?? application.job.salaryMax,
    salaryType: application.offerSalaryType ?? application.job.salaryType,
  })

  return prisma.billingEvent.create({
    data: {
      companyId: application.company.id,
      applicationId,
      eventType: "hired",
      amount: feeAmount,
      provider: "moneyforward",
      status: "pending",
    },
  })
}
