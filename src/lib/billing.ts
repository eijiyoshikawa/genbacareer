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
    include: {
      company: true,
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

  // Job 個別設定 (hiringFeeAmount) があればそれを使い、無ければ理論年収×35%で自動計算
  const feeAmount = resolveHiringFee(application.job)

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

  // MoneyForward 自動連携は未導入 (RELEASE_TODO.md: 請求書は /admin/billing-todo から
  // 手動発行する運用)。MF_* が未設定の環境で API を呼ぶと必ず失敗し、以前は
  // BillingEvent が即 failed になって「発行待ち」一覧 (status=pending) と日次
  // サマリーの両方から消え、請求漏れになっていた。未設定なら pending のまま返す。
  const mfConfigured =
    !!process.env.MF_CLIENT_ID &&
    !!process.env.MF_CLIENT_SECRET &&
    !!process.env.MF_OFFICE_ID
  if (!mfConfigured) {
    return { billingEvent, invoiceId: null, provider: "manual" as const }
  }

  try {
    return await invoiceViaMoneyForward({
      billingEventId: billingEvent.id,
      company: application.company,
      jobTitle: application.job.title,
      userName: application.user?.name ?? "求職者",
      amount: feeAmount,
    })
  } catch (error) {
    // 自動発行に失敗しても pending のまま残し、admin が手動発行できるようにする
    // (failed にすると発行待ち一覧から消えて請求漏れになる)。
    console.error(
      `[billing] MoneyForward invoice failed for billingEvent ${billingEvent.id}; left pending for manual issue:`,
      error
    )
    return { billingEvent, invoiceId: null, provider: "manual" as const }
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
