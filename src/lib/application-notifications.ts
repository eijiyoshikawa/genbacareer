/**
 * 応募ステータス更新時の通知メール。
 *
 * 求職者にはステータスが変わったタイミングで自動でメールを送る。
 * SENDGRID_API_KEY 未設定なら開発ログのみ。
 */

import { sendEmail } from "@/lib/email"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

const STATUS_BODY: Record<
  string,
  { subject: (jobTitle: string) => string; lead: string }
> = {
  reviewing: {
    subject: (job) => `【選考開始】${job} のご応募ありがとうございます`,
    lead: "ご応募いただいた内容を確認し、現在書類選考中です。結果は改めてご連絡いたします。",
  },
  interview: {
    subject: (job) => `【面接のご案内】${job}`,
    lead: "書類選考を通過いたしました。担当者よりこのメール または LINE で面接日程の調整を行います。",
  },
  offered: {
    subject: (job) => `【内定のお知らせ】${job}`,
    lead: "選考通過おめでとうございます。内定のご案内をお送りいたします。",
  },
  hired: {
    subject: (job) => `【採用決定】${job}`,
    lead: "正式採用となりました。今後の手続きについて、担当者よりご連絡いたします。",
  },
  rejected: {
    subject: (job) => `【選考結果のお知らせ】${job}`,
    lead: "ご応募ありがとうございました。今回はご縁が叶わない結果となりましたが、他の求人もぜひご確認ください。",
  },
}

export async function sendApplicationStatusEmail(args: {
  to: string
  candidateName: string | null
  companyName: string
  jobTitle: string
  newStatus: string
  note?: string
}): Promise<void> {
  const template = STATUS_BODY[args.newStatus]
  if (!template) return

  const subject = template.subject(args.jobTitle)
  const greeting = args.candidateName
    ? `${escapeHtml(args.candidateName)} 様`
    : "ご応募者様"

  const noteBlock = args.note
    ? `<p style="margin:0 0 16px;padding:12px;background:#fff7ed;border-left:3px solid #f97316;color:#333;font-size:13px;">${escapeHtml(args.note)}</p>`
    : ""

  const html = `
<!doctype html>
<html lang="ja">
<body style="margin:0;padding:0;background:#f8f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#333;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border:1px solid #e5e5e5;">
          <tr>
            <td style="padding:24px;">
              <p style="margin:0 0 8px;font-size:13px;color:#888;">ゲンバキャリア</p>
              <h1 style="margin:0 0 16px;font-size:20px;color:#0f172a;">${escapeHtml(subject)}</h1>
              <p style="margin:0 0 12px;">${greeting}</p>
              <p style="margin:0 0 16px;line-height:1.7;">${escapeHtml(template.lead)}</p>
              ${noteBlock}
              <p style="margin:0 0 16px;font-size:14px;line-height:1.7;">
                <strong>応募求人:</strong> ${escapeHtml(args.jobTitle)}<br>
                <strong>企業名:</strong> ${escapeHtml(args.companyName)}
              </p>
              <p style="margin:24px 0 8px;">
                <a href="${SITE_URL}/mypage/applications" style="display:inline-block;background:#16a34a;color:#fff;padding:10px 20px;text-decoration:none;font-weight:bold;font-size:14px;">マイページで詳細を見る</a>
              </p>
              <hr style="border:none;border-top:1px solid #e5e5e5;margin:24px 0;">
              <p style="margin:0;font-size:11px;color:#999;line-height:1.6;">
                このメールはゲンバキャリア（${SITE_URL}）への応募に伴って自動送信されています。<br>
                配信停止やお問い合わせは <a href="${SITE_URL}/contact" style="color:#16a34a;">こちら</a>。
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`.trim()

  await sendEmail({ to: args.to, subject, html })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
