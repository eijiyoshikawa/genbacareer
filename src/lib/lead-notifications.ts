/**
 * 新規 LINE リード発生時の通知配信。
 *
 * 通知チャネル（環境変数で個別 ON/OFF）:
 *  - Slack:    LEAD_NOTIFY_SLACK_WEBHOOK ... Slack Incoming Webhook URL
 *  - メール:   LEAD_NOTIFY_EMAILS         ... カンマ区切りの宛先メール
 *
 * どちらか片方だけ設定 / 両方 / 全部空 いずれも OK（空ならスキップ）。
 *
 * 失敗時はログを残すだけで、呼び出し側に例外を伝播させない。
 * リードの保存自体はすでに完了している前提のため、通知失敗で UX を阻害しない。
 */

import { sendEmail } from "./email"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

export interface LeadNotificationPayload {
  leadId: string
  name: string
  phone: string
  email: string
  experienceYears: number | null
  notes: string | null
  job: { id: string; title: string; prefecture: string; city: string | null } | null
}

/** 全チャネルへ並列通知。fire-and-forget 推奨。 */
export async function notifyNewLead(payload: LeadNotificationPayload): Promise<void> {
  await Promise.allSettled([notifySlack(payload), notifyEmail(payload)])
}

// === Slack ================================================================

async function notifySlack(p: LeadNotificationPayload): Promise<void> {
  const url = process.env.LEAD_NOTIFY_SLACK_WEBHOOK?.trim()
  if (!url) return
  const text = formatSlackMessage(p)
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        // Slack で見やすいよう Blocks も併用
        blocks: buildSlackBlocks(p),
      }),
    })
    if (!res.ok) {
      console.warn(`[lead-notify.slack] HTTP ${res.status}: ${await res.text().catch(() => "")}`)
    }
  } catch (e) {
    console.warn(`[lead-notify.slack] failed: ${e instanceof Error ? e.message : e}`)
  }
}

function formatSlackMessage(p: LeadNotificationPayload): string {
  const job = p.job ? ` 応募: ${p.job.title} (${p.job.prefecture})` : ""
  return `🎯 新規 LINE リード: ${p.name} / ${p.phone}${job}`
}

function buildSlackBlocks(p: LeadNotificationPayload): unknown[] {
  const detailsLines = [
    `*氏名:* ${escapeSlack(p.name)}`,
    `*電話:* ${escapeSlack(p.phone)}`,
    `*メール:* ${escapeSlack(p.email)}`,
    p.experienceYears !== null ? `*経験年数:* ${p.experienceYears} 年` : null,
    p.notes ? `*備考:*\n${escapeSlack(p.notes).slice(0, 500)}` : null,
  ].filter(Boolean)

  return [
    {
      type: "header",
      text: { type: "plain_text", text: "🎯 新規 LINE リード", emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: detailsLines.join("\n") },
    },
    ...(p.job
      ? [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*応募求人:* <${SITE_URL}/jobs/${p.job.id}|${escapeSlack(p.job.title)}>\n${p.job.prefecture}${p.job.city ? ` ${p.job.city}` : ""}`,
            },
          },
        ]
      : []),
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "管理画面で開く", emoji: true },
          url: `${SITE_URL}/admin/line-leads`,
          style: "primary",
        },
      ],
    },
  ]
}

function escapeSlack(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

// === Email ================================================================

async function notifyEmail(p: LeadNotificationPayload): Promise<void> {
  const raw = process.env.LEAD_NOTIFY_EMAILS?.trim() ?? ""
  if (!raw) return
  const recipients = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /\S+@\S+\.\S+/.test(s))
  if (recipients.length === 0) return

  const subject = `🎯 新規 LINE リード: ${p.name} ${p.job ? `(${p.job.title})` : ""}`
  const html = buildEmailHtml(p)

  // sendEmail は単一宛先想定なので個別送信
  for (const to of recipients) {
    try {
      await sendEmail({ to, subject, html })
    } catch (e) {
      console.warn(`[lead-notify.email] to=${to} failed: ${e instanceof Error ? e.message : e}`)
    }
  }
}

function buildEmailHtml(p: LeadNotificationPayload): string {
  const adminUrl = `${SITE_URL}/admin/line-leads`
  const jobBlock = p.job
    ? `<tr><th align="left">応募求人</th><td><a href="${SITE_URL}/jobs/${p.job.id}">${escapeHtml(p.job.title)}</a> (${escapeHtml(p.job.prefecture)}${p.job.city ? ` ${escapeHtml(p.job.city)}` : ""})</td></tr>`
    : ""
  const notesBlock = p.notes
    ? `<tr><th align="left">備考</th><td><pre style="white-space:pre-wrap;font-family:inherit;margin:0">${escapeHtml(p.notes)}</pre></td></tr>`
    : ""
  return `
<div style="font-family:-apple-system, sans-serif; max-width:600px; margin:0 auto;">
  <h2 style="color:#e25c0e">🎯 新規 LINE リード</h2>
  <table cellspacing="0" cellpadding="6" style="border-collapse:collapse; width:100%; font-size:14px">
    <tr><th align="left" style="width:120px">氏名</th><td>${escapeHtml(p.name)}</td></tr>
    <tr><th align="left">電話</th><td><a href="tel:${escapeHtml(p.phone)}">${escapeHtml(p.phone)}</a></td></tr>
    <tr><th align="left">メール</th><td><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></td></tr>
    ${p.experienceYears !== null ? `<tr><th align="left">経験年数</th><td>${p.experienceYears} 年</td></tr>` : ""}
    ${jobBlock}
    ${notesBlock}
  </table>
  <p style="margin-top:20px">
    <a href="${adminUrl}" style="display:inline-block;background:#e25c0e;color:white;padding:10px 18px;text-decoration:none;font-weight:bold">管理画面で開く</a>
  </p>
  <p style="color:#888;font-size:12px">ゲンバキャリア 自動通知</p>
</div>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
