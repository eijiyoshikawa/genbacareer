/**
 * 月額プラン / SNS プランの期限 30 日前通知 cron。
 *
 * 毎日 04:00 UTC (= 13:00 JST) に Vercel Cron Jobs から呼び出す。
 * Authorization ヘッダーで CRON_SECRET を検証。
 *
 * 対象:
 *   planType ∈ (monthly_12, monthly_24, sns_client) AND
 *   planPaidUntil ∈ (now, now + 30 days] AND
 *   planExpiryNotifiedAt IS NULL
 *
 * 通知方法:
 *   - 企業の contactEmail 宛にメール (共通テンプレ使用)
 *   - 企業の全 admin / member の Notification にも作成
 *   - planExpiryNotifiedAt = now() を set (重複送信防止)
 */

import { prisma } from "@/lib/db"
import { sendEmail } from "@/lib/email"
import { renderEmailLayout, renderEmailText, baseUrl } from "@/lib/email-template"
import { PLAN_LABELS, type PlanType } from "@/lib/plans"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SOON_THRESHOLD_DAYS = 30

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const threshold = new Date(now.getTime() + SOON_THRESHOLD_DAYS * 24 * 60 * 60 * 1000)

  const companies = await prisma.company.findMany({
    where: {
      planType: { in: ["monthly_12", "monthly_24", "sns_client"] },
      planPaidUntil: { gt: now, lte: threshold },
      planExpiryNotifiedAt: null,
    },
    select: {
      id: true,
      name: true,
      contactEmail: true,
      planType: true,
      planPaidUntil: true,
      companyUsers: {
        select: { id: true, email: true, name: true },
      },
    },
  })

  let notified = 0
  let mailFailures = 0

  for (const c of companies) {
    if (!c.planPaidUntil) continue

    const planLabel = PLAN_LABELS[c.planType as PlanType] ?? c.planType
    const billingUrl = `${baseUrl()}/company/billing`
    const expiryStr = c.planPaidUntil.toLocaleDateString("ja-JP", {
      timeZone: "Asia/Tokyo",
    })

    const layout = {
      preheader: `${c.name} 様の掲載プランが ${expiryStr} に期限を迎えます。`,
      greeting: `${c.name} 様`,
      paragraphs: [
        "いつもゲンバキャリアをご利用いただき、ありがとうございます。",
        `現在ご契約中の「${planLabel}」が ${expiryStr} に期限を迎えます。`,
        "継続をご希望の場合は、運営 (info@let-inc.net) までご連絡ください。期限内のご連絡で、掲載中の求人を切れ目なく継続できます。",
      ],
      cta: { label: "契約状況を確認する", url: billingUrl, variant: "primary" as const },
      kvHeading: "契約情報",
      kv: [
        { label: "プラン", value: planLabel },
        { label: "終了日", value: expiryStr },
      ],
    }

    // メール送信に失敗した場合は planExpiryNotifiedAt をセットせず、
    // 翌日以降の cron 実行で再送を試みる（"重複送信防止" は成功時のみの話で、
    // 失敗した企業を黙って対象から外して二度と通知しない、は意図ではない）。
    let mailFailed = false
    if (c.contactEmail) {
      try {
        await sendEmail({
          to: c.contactEmail,
          subject: `【期限通知】ご契約プランの満了日が近づいています (${expiryStr}) — ゲンバキャリア`,
          html: renderEmailLayout(layout),
          text: renderEmailText(layout),
        })
      } catch (err) {
        mailFailures += 1
        mailFailed = true
        console.error(`[cron/plan-expiry-notice] mail failed for ${c.id}:`, err)
      }
    }

    // 企業ユーザー全員にサイト内通知
    if (c.companyUsers.length > 0) {
      await prisma.notification.createMany({
        data: c.companyUsers.map((u) => ({
          userId: u.id,
          type: "plan_expiry",
          title: "ご契約プランの期限が近づいています",
          body: `${planLabel} は ${expiryStr} に期限を迎えます。`,
          linkUrl: "/company/billing",
        })),
      }).catch((e) => {
        console.error(`[cron/plan-expiry-notice] notif failed for ${c.id}:`, e)
      })
    }

    if (mailFailed) {
      continue
    }

    await prisma.company.update({
      where: { id: c.id },
      data: { planExpiryNotifiedAt: now },
    })
    notified += 1
  }

  console.log(
    `[cron/plan-expiry-notice] notified=${notified} mailFailures=${mailFailures}`,
  )

  return Response.json({
    ok: true,
    notified,
    mailFailures,
    timestamp: now.toISOString(),
  })
}
