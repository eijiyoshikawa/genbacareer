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
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

    // 宛先: 担当メール。未設定なら企業ユーザーのログインメールへ送る
    // (以前は宛先なしでも「通知済み」にしており、誰にも届かないまま失効していた)。
    const recipients = c.contactEmail
      ? [c.contactEmail]
      : Array.from(new Set(c.companyUsers.map((u) => u.email).filter(Boolean)))
    if (recipients.length === 0) {
      console.warn(`[cron/plan-expiry-notice] no recipient for ${c.id}`)
      continue
    }

    // 先に「通知済み」を原子的に確保する。cron の重複配信や手動再実行が重なっても
    // 同じ企業へ二重送信しない。
    const claim = await prisma.company
      .updateMany({
        where: { id: c.id, planExpiryNotifiedAt: null },
        data: { planExpiryNotifiedAt: now },
      })
      .catch((err) => {
        console.error(`[cron/plan-expiry-notice] claim failed for ${c.id}:`, err)
        return { count: 0 }
      })
    if (claim.count === 0) continue

    // メール送信に失敗した企業は通知済みを取り消す (翌日の cron で再送する)
    let delivered = 0
    for (const to of recipients) {
      try {
        const result = await sendEmail({
          to,
          subject: `【期限通知】ご契約プランの満了日が近づいています (${expiryStr}) — ゲンバキャリア`,
          html: renderEmailLayout(layout),
          text: renderEmailText(layout),
        })
        if (result && result.success === false) {
          console.error(`[cron/plan-expiry-notice] mail not sent for ${c.id}`)
        } else {
          delivered += 1
        }
      } catch (err) {
        console.error(`[cron/plan-expiry-notice] mail failed for ${c.id}:`, err)
      }
    }

    if (delivered === 0) {
      mailFailures += 1
      await prisma.company
        .updateMany({
          where: { id: c.id, planExpiryNotifiedAt: now },
          data: { planExpiryNotifiedAt: null },
        })
        .catch((err) => {
          console.error(`[cron/plan-expiry-notice] revert failed for ${c.id}:`, err)
        })
      continue
    }

    // 注: 以前はここで notifications テーブルへ企業ユーザー宛の行を作っていたが、
    // notifications.user_id は users (求職者) への外部キーのため必ず失敗していた。
    // 企業向けのサイト内通知の仕組みが無いので、通知はメールのみとする。
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
