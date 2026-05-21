import { prisma } from "./db"
import { stripe } from "./stripe"
import { createMfPartner, createMfBilling } from "./moneyforward"
import { resolveHiringFee } from "./hiring-fee"

/**
 * 採用確定時に成果報酬の請求書を作成する。
 *
 * Company.paymentMethod を見て分岐：
 *   - "stripe"        : Stripe Invoice（カード or send_invoice）
 *   - "moneyforward"  : マネーフォワード クラウド請求書（銀行振込）
 *
 * 共通フロー:
 *   1. BillingEvent を pending で作成
 *   2. 各プロバイダで取引先を取得 or 作成
 *   3. 請求書を作成・送付
 *   4. BillingEvent を invoiced に更新（失敗時は failed）
 */
export async function createHiringInvoice(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      company: true,
      job: { select: { title: true, hiringFeeAmount: true } },
      user: { select: { name: true } },
    },
  })

  if (!application || !application.company) {
    throw new Error(`Application ${applicationId} not found or has no company`)
  }

  const provider = application.company.paymentMethod === "moneyforward"
    ? "moneyforward"
    : "stripe"

  // Job 個別設定 (hiringFeeAmount) があればそれを使い、無ければ定数フォールバック
  const feeAmount = resolveHiringFee(application.job)

  const billingEvent = await prisma.billingEvent.create({
    data: {
      companyId: application.company.id,
      applicationId,
      eventType: "hired",
      amount: feeAmount,
      provider,
      status: "pending",
    },
  })

  try {
    if (provider === "moneyforward") {
      return await invoiceViaMoneyForward({
        billingEventId: billingEvent.id,
        company: application.company,
        jobTitle: application.job.title,
        userName: application.user?.name ?? "求職者",
        amount: feeAmount,
      })
    }
    return await invoiceViaStripe({
      billingEventId: billingEvent.id,
      company: application.company,
      jobTitle: application.job.title,
      userName: application.user?.name ?? "求職者",
      applicationId,
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

// ----------------------------------------------------------------------------
// Stripe
// ----------------------------------------------------------------------------

type InvoiceArgs = {
  billingEventId: string
  company: {
    id: string
    name: string
    contactEmail: string | null
    stripeCustomerId: string | null
    mfPartnerId: string | null
  }
  jobTitle: string
  userName: string
  /** Job 個別設定 or HIRING_FEE_AMOUNT 定数からの解決済み金額 */
  amount: number
}

async function invoiceViaStripe(
  args: InvoiceArgs & { applicationId: string }
) {
  const { billingEventId, company, jobTitle, userName, applicationId, amount } = args

  let stripeCustomerId = company.stripeCustomerId
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      email: company.contactEmail ?? undefined,
      metadata: { companyId: company.id },
    })
    stripeCustomerId = customer.id

    await prisma.company.update({
      where: { id: company.id },
      data: { stripeCustomerId },
    })
  }

  await stripe.invoiceItems.create({
    customer: stripeCustomerId,
    amount,
    currency: "jpy",
    description: `成果報酬 — ${jobTitle}（${userName}の採用）`,
    metadata: {
      billingEventId,
      applicationId,
      companyId: company.id,
    },
  })

  const invoice = await stripe.invoices.create({
    customer: stripeCustomerId,
    auto_advance: true,
    collection_method: "send_invoice",
    days_until_due: 30,
    metadata: { billingEventId },
  })

  await stripe.invoices.finalizeInvoice(invoice.id)

  const billingEvent = await prisma.billingEvent.update({
    where: { id: billingEventId },
    data: {
      stripeInvoiceId: invoice.id,
      status: "invoiced",
    },
  })

  return { billingEvent, invoiceId: invoice.id, provider: "stripe" as const }
}

// ----------------------------------------------------------------------------
// マネーフォワード クラウド請求書
// ----------------------------------------------------------------------------

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
