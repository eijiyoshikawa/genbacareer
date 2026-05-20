import { prisma } from "./db"
import { stripe, HIRING_FEE_AMOUNT } from "./stripe"

/**
 * 採用確定時に成果報酬の請求書を作成する。
 *
 * 処理フロー:
 * 1. BillingEvent を pending で作成
 * 2. Stripe Customer を取得 or 作成
 * 3. InvoiceItem + Invoice を作成して自動送付
 * 4. BillingEvent を invoiced に更新
 */
export async function createHiringInvoice(applicationId: string) {
  const existing = await prisma.billingEvent.findUnique({
    where: { applicationId },
  })
  if (existing) {
    return { billingEvent: existing, invoiceId: existing.stripeInvoiceId }
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      company: true,
      job: { select: { title: true } },
      user: { select: { name: true } },
    },
  })

  if (!application || !application.company) {
    throw new Error(`Application ${applicationId} not found or has no company`)
  }

  // Create billing event
  const billingEvent = await prisma.billingEvent.create({
    data: {
      companyId: application.company.id,
      applicationId,
      eventType: "hired",
      amount: HIRING_FEE_AMOUNT,
      status: "pending",
    },
  })

  try {
    // Get or create Stripe customer
    let stripeCustomerId = application.company.stripeCustomerId

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: application.company.name,
        email: application.company.contactEmail ?? undefined,
        metadata: { companyId: application.company.id },
      })
      stripeCustomerId = customer.id

      await prisma.company.update({
        where: { id: application.company.id },
        data: { stripeCustomerId },
      })
    }

    // Create invoice item
    await stripe.invoiceItems.create({
      customer: stripeCustomerId,
      amount: HIRING_FEE_AMOUNT,
      currency: "jpy",
      description: `成果報酬 — ${application.job.title}（${application.user?.name ?? "求職者"}の採用）`,
      metadata: {
        billingEventId: billingEvent.id,
        applicationId,
        companyId: application.company.id,
      },
    })

    // Create and finalize invoice
    const invoice = await stripe.invoices.create({
      customer: stripeCustomerId,
      auto_advance: true, // Auto-finalize
      collection_method: "send_invoice",
      days_until_due: 30,
      metadata: {
        billingEventId: billingEvent.id,
      },
    })

    await stripe.invoices.finalizeInvoice(invoice.id)

    // Update billing event
    await prisma.billingEvent.update({
      where: { id: billingEvent.id },
      data: {
        stripeInvoiceId: invoice.id,
        status: "invoiced",
      },
    })

    return { billingEvent, invoiceId: invoice.id }
  } catch (error) {
    // Mark as failed
    await prisma.billingEvent.update({
      where: { id: billingEvent.id },
      data: { status: "failed" },
    })
    throw error
  }
}
