/**
 * 請求書発行待ち / 戻入 credit note 待ち の日次サマリーを admin に送る cron。
 *
 * 毎日 09:00 UTC (= 18:00 JST) に Vercel Cron Jobs から呼び出す。
 *
 * 配信内容:
 *   A. BillingEvent.status='pending' の件数 + 合計金額
 *   B. BillingEvent.status='invoiced' の件数 + 合計金額 (入金待ち)
 *   C. EarlyResignation.status='approved' の件数 + 合計返金額
 *
 * いずれかが > 0 の場合のみメール送信 (静かな日はスキップ)。
 * 宛先は ADMIN_NOTIFY_EMAIL (info@let-inc.net) 固定。
 */

import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { renderEmailLayout, renderEmailText, baseUrl } from "@/lib/email-template"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ADMIN_EMAIL = "info@let-inc.net"

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const [pending, invoiced, refunds, byCompany] = await Promise.all([
    prisma.billingEvent.aggregate({
      where: { status: "pending" },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.billingEvent.aggregate({
      where: { status: "invoiced" },
      _count: true,
      _sum: { amount: true },
    }),
    prisma.earlyResignation.aggregate({
      where: { status: "approved" },
      _count: true,
      _sum: { refundAmount: true },
    }),
    // 企業別 pending 小計 (上位 5 社)
    prisma.billingEvent.groupBy({
      by: ["companyId"],
      where: { status: "pending" },
      _sum: { amount: true },
      _count: true,
      orderBy: { _sum: { amount: "desc" } },
      take: 5,
    }),
  ])

  const pendingCount = pending._count ?? 0
  const pendingAmount = pending._sum.amount ?? 0
  const invoicedCount = invoiced._count ?? 0
  const invoicedAmount = invoiced._sum.amount ?? 0
  const refundCount = refunds._count ?? 0
  const refundAmount = refunds._sum.refundAmount ?? 0

  const totalTasks = pendingCount + refundCount

  if (totalTasks === 0) {
    console.log("[cron/billing-todo-digest] no tasks, skipping email")
    return Response.json({ ok: true, skipped: true, pendingCount: 0 })
  }

  // 企業名を取得 (アドホック)
  const companyIds = byCompany.map((r) => r.companyId)
  const companies =
    companyIds.length > 0
      ? await prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: { id: true, name: true },
        })
      : []
  const companyNameById = new Map(companies.map((c) => [c.id, c.name]))

  const breakdownKv = byCompany
    .map((r) => ({
      label: companyNameById.get(r.companyId) ?? r.companyId,
      value: `¥${(r._sum.amount ?? 0).toLocaleString()} (${r._count} 件)`,
    }))

  const todoUrl = `${baseUrl()}/admin/billing-todo`
  const layout = {
    preheader: `本日の請求書発行待ち ${pendingCount} 件 (¥${pendingAmount.toLocaleString()})、戻入 ${refundCount} 件`,
    paragraphs: [
      "ゲンバキャリア admin 日次サマリーです。本日時点で以下の対応待ちタスクがあります。",
    ],
    kvHeading: "対応待ちタスク",
    kv: [
      {
        label: "A. 請求書発行待ち",
        value: `${pendingCount} 件 / ¥${pendingAmount.toLocaleString()}`,
      },
      {
        label: "B. 発行済 (入金待ち)",
        value: `${invoicedCount} 件 / ¥${invoicedAmount.toLocaleString()}`,
      },
      {
        label: "C. 戻入 credit note 待ち",
        value: `${refundCount} 件 / ¥${refundAmount.toLocaleString()}`,
      },
    ],
    detailSection:
      breakdownKv.length > 0
        ? {
            heading: "請求書発行待ち 上位企業 (¥ 多い順)",
            body: breakdownKv
              .map((r) => `${r.label}: ${r.value}`)
              .join("\n"),
          }
        : undefined,
    cta: {
      label: "発行リストを開く",
      url: todoUrl,
      variant: "primary" as const,
    },
    showAutoSendNotice: false,
  }

  await sendEmail({
    to: ADMIN_EMAIL,
    subject: `[ゲンバキャリア admin] 請求書発行待ち ${pendingCount} 件 / ¥${pendingAmount.toLocaleString()} — 日次サマリー`,
    html: renderEmailLayout(layout),
    text: renderEmailText(layout),
  })

  console.log(
    `[cron/billing-todo-digest] pendingCount=${pendingCount} pendingAmount=${pendingAmount} refundCount=${refundCount}`,
  )

  return Response.json({
    ok: true,
    pendingCount,
    pendingAmount,
    invoicedCount,
    refundCount,
  })
}
