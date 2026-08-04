import { prisma } from "./db"
import { createMfPartner, createMfBilling } from "./moneyforward"
import { resolveHiringFee } from "./hiring-fee"

/**
 * 採用確定時に成果報酬の請求書を作成する。
 *
 * 全企業共通: マネーフォワード クラウド請求書 (銀行振込) で発行する。
 * （景品表示法・過大広告対応の方針見直しに伴い Stripe カード決済は廃止）
 *
 * 共通フロー:
 *   1. BillingEvent を pending で作成
 *   2. MoneyForward で取引先を取得 or 作成
 *   3. 請求書を作成・送付
 *   4. BillingEvent を invoiced に更新（失敗時は failed）
 */
export async function createHiringInvoice(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      offerSalaryMin: true,
      offerSalaryMax: true,
      offerSalaryType: true,
      company: {
        select: {
          id: true,
          name: true,
          contactEmail: true,
          mfPartnerId: true,
        },
      },
      job: {
        select: {
          title: true,
          hiringFeeAmount: true,
          salaryMin: true,
          salaryMax: true,
          salaryType: true,
        },
      },
      user: { select: { name: true } },
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

  const billingEvent = await prisma.billingEvent.create({
    data: {
      companyId: application.company.id,
      applicationId,
      eventType: "hired",
      amount: feeAmount,
      provider: "moneyforward",
      status: "pending",
    },
  })

  try {
    return await invoiceViaMoneyForward({
      billingEventId: billingEvent.id,
      company: application.company,
      jobTitle: application.job.title,
      userName: application.user?.name ?? "求職者",
      amount: feeAmount,
    })
  } catch (error) {
    await prisma.billingEvent.update({
      where: { id: billingEvent.id },
      data: { status: "failed" },
    })
    throw error
  }
}

type InvoiceArgs = {
  billingEventId: string
  company: {
    id: string
    name: string
    contactEmail: string | null
    mfPartnerId: string | null
  }
  jobTitle: string
  userName: string
  /** Job 個別設定 or 理論年収×35% からの解決済み金額 */
  amount: number
}

async function invoiceViaMoneyForward(args: InvoiceArgs) {
  const { billingEventId, company, jobTitle, userName, amount } = args

  let partnerId = company.mfPartnerId
  if (!partnerId) {
    const partner = await createMfPartner({
      name: company.name,
      email: company.contactEmail ?? undefined,
    })
    partnerId = partner.id

    await prisma.company.update({
      where: { id: company.id },
      data: { mfPartnerId: partnerId },
    })
  }

  const billing = await createMfBilling({
    partnerId,
    title: "成果報酬請求書",
    itemName: `成果報酬 — ${jobTitle}（${userName}様の採用決定）`,
    amount,
    daysUntilDue: 30,
    metadata: {
      billingEventId,
      companyId: company.id,
    },
  })

  const billingEvent = await prisma.billingEvent.update({
    where: { id: billingEventId },
    data: {
      mfBillingId: billing.id,
      invoiceUrl: billing.pdf_url ?? billing.web_url ?? billing.document_url ?? null,
      status: "invoiced",
    },
  })

  return {
    billingEvent,
    invoiceId: billing.id,
    provider: "moneyforward" as const,
  }
}
