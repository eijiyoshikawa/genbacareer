/**
 * メール送信ヘルパー
 *
 * 本番環境では SMTP (Gmail Workspace 想定) を使用。
 * 開発環境 / 認証情報が無いときは console.log にフォールバック。
 *
 * 必要な env vars:
 *   - SMTP_USER: 送信元 Gmail (例: genbacareer@let-inc.net)
 *   - SMTP_PASS: アプリパスワード (16 桁、Google アカウント設定で発行)
 *   - SMTP_HOST: smtp.gmail.com (省略可)
 *   - SMTP_PORT: 587 (省略可)
 *   - MAIL_FROM: 表示名付きアドレス
 *                (例: "ゲンバキャリア <genbacareer@let-inc.net>")
 */

import nodemailer from "nodemailer"

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter(): nodemailer.Transporter | null {
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  if (!user || !pass) return null
  if (cachedTransporter) return cachedTransporter

  const host = process.env.SMTP_HOST ?? "smtp.gmail.com"
  const port = Number(process.env.SMTP_PORT ?? "587")
  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    // 587 は STARTTLS, 465 は SSL
    secure: port === 465,
    auth: { user, pass },
  })
  return cachedTransporter
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const transporter = getTransporter()

  if (!transporter) {
    // Development fallback
    console.log(`[email] To: ${to}`)
    console.log(`[email] Subject: ${subject}`)
    console.log(`[email] Body: ${html.slice(0, 200)}...`)
    return { success: true, dev: true }
  }

  const from =
    process.env.MAIL_FROM ??
    `ゲンバキャリア <${process.env.SMTP_USER ?? "noreply@genbacareer.jp"}>`

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    })
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[email] SMTP error: ${msg}`)
    throw new Error(`Failed to send email: ${msg}`)
  }
}

/** メール確認メール送信（求職者サインアップ時） */
export async function sendEmailVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const verifyUrl = `${baseUrl}/verify-email?token=${token}`

  await sendEmail({
    to: email,
    subject: "メールアドレスのご確認 — ゲンバキャリア",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>ゲンバキャリアへのご登録ありがとうございます</h2>
        <p>以下のリンクからメールアドレスの確認を完了してください。</p>
        <p>
          <a href="${verifyUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            メールアドレスを確認する
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          このリンクは24時間有効です。<br>
          確認が完了するまで、求人への応募ができませんのでご注意ください。<br>
          心当たりがない場合はこのメールを無視してください。
        </p>
      </div>
    `,
  })
}

/** 応募通知メール送信（企業向け） */
export async function sendApplicationNotificationEmail(
  toEmail: string,
  jobTitle: string,
  applicantName: string,
  applicationId: string
) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const detailUrl = `${baseUrl}/company/applications/${applicationId}`

  await sendEmail({
    to: toEmail,
    subject: `新着応募: ${jobTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>新しい応募が届きました</h2>
        <p><strong>${jobTitle}</strong> に <strong>${applicantName}</strong> さんから応募がありました。</p>
        <p>
          <a href="${detailUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            応募内容を確認する
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">ゲンバキャリア</p>
      </div>
    `,
  })
}

/** パスワードリセットメール送信 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const baseUrl = process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const resetUrl = `${baseUrl}/reset-password?token=${token}`

  await sendEmail({
    to: email,
    subject: "パスワードリセットのご案内 — ゲンバキャリア",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>パスワードリセット</h2>
        <p>以下のリンクからパスワードをリセットしてください。</p>
        <p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            パスワードをリセットする
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          このリンクは1時間有効です。心当たりがない場合はこのメールを無視してください。
        </p>
      </div>
    `,
  })
}

/** 応募完了通知メール送信（求職者向け） */
export async function sendApplicationConfirmEmail(
  email: string,
  jobTitle: string,
  companyName: string
) {
  await sendEmail({
    to: email,
    subject: `応募が完了しました — ${jobTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>応募が完了しました</h2>
        <p><strong>${companyName}</strong> の <strong>${jobTitle}</strong> に応募が完了しました。</p>
        <p>企業からの返信をお待ちください。</p>
        <p style="color: #6b7280; font-size: 14px;">ゲンバキャリア</p>
      </div>
    `,
  })
}

const ADMIN_NOTIFY_EMAIL = "info@let-inc.net"

/** 企業登録時の welcome メール（企業担当者宛・status=pending の旨を案内） */
export async function sendCompanyRegistrationEmail(
  email: string,
  companyName: string
) {
  await sendEmail({
    to: email,
    subject: "ご登録ありがとうございます — ゲンバキャリア",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${escapeHtml(companyName)} 様</h2>
        <p>ゲンバキャリアへのご登録ありがとうございます。</p>
        <p>
          現在、運営による登録内容の確認を行っております。<br>
          通常 <strong>1〜2 営業日</strong> 以内に承認が完了し、求人投稿・スカウト送信がご利用いただけるようになります。
        </p>
        <p>承認が完了した時点で、別途通知メールをお送りいたします。</p>
        <p style="color: #6b7280; font-size: 14px;">
          ご不明点がございましたら <a href="mailto:info@let-inc.net">info@let-inc.net</a> までご連絡ください。<br>
          ゲンバキャリア
        </p>
      </div>
    `,
  })
}

/** 企業登録時の管理者通知メール（info@let-inc.net 宛） */
export async function sendCompanyRegistrationAdminNotification(args: {
  companyId: string
  companyName: string
  industry: string
  prefecture: string
  contactEmail: string
}) {
  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const reviewUrl = `${baseUrl}/admin/companies/${args.companyId}`

  await sendEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `[ゲンバキャリア] 新規企業登録: ${args.companyName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>新規企業登録</h2>
        <p>承認待ちの企業登録が届きました。</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; width: 120px;">会社名</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(args.companyName)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;">業種</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(args.industry)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;">都道府県</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(args.prefecture)}</td></tr>
          <tr><td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;">担当メール</td><td style="padding: 8px; border: 1px solid #e5e7eb;">${escapeHtml(args.contactEmail)}</td></tr>
        </table>
        <p style="margin-top: 16px;">
          <a href="${reviewUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            管理画面で確認する
          </a>
        </p>
      </div>
    `,
  })
}

/** 企業承認完了の通知メール（企業担当者宛） */
export async function sendCompanyApprovalEmail(
  email: string,
  companyName: string
) {
  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

  await sendEmail({
    to: email,
    subject: "ご登録が承認されました — ゲンバキャリア",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${escapeHtml(companyName)} 様</h2>
        <p>ゲンバキャリアへのご登録が承認されました。</p>
        <p>求人投稿・スカウト送信などのすべての機能をご利用いただけます。</p>
        <p>
          <a href="${baseUrl}/company/jobs/new" style="display: inline-block; padding: 12px 24px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
            求人を投稿する
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">ゲンバキャリア</p>
      </div>
    `,
  })
}

/** 企業承認却下の通知メール（企業担当者宛） */
export async function sendCompanyRejectionEmail(
  email: string,
  companyName: string,
  reason?: string | null
) {
  await sendEmail({
    to: email,
    subject: "ご登録についてのお知らせ — ゲンバキャリア",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${escapeHtml(companyName)} 様</h2>
        <p>恐れ入りますが、頂戴したご登録内容では本サービスをご利用いただくことができませんでした。</p>
        ${reason ? `<p><strong>理由:</strong> ${escapeHtml(reason)}</p>` : ""}
        <p>詳細につきましては <a href="mailto:info@let-inc.net">info@let-inc.net</a> までお問い合わせください。</p>
        <p style="color: #6b7280; font-size: 14px;">ゲンバキャリア</p>
      </div>
    `,
  })
}

/**
 * 12.x スカウト着信通知メール (マイナビ転職参考の構成)。
 *
 * 件名: 「{企業名}からスカウトが届きました！[ゲンバキャリア / スカウト着信通知]」
 * 本文構成: 期限明示 → 自動送信注意 → 宛名 → イントロ → CTA → 期限 → [企業名][職種名]
 *           → 本文抜粋 → 続きを読む → 他のスカウト → 配信停止 → フッター
 */
export async function sendScoutEmail(args: {
  to: string
  userName: string
  companyName: string
  jobTitle: string
  subject: string
  bodyExcerpt: string
  scoutId: string
  expiresAt: Date
}) {
  const baseUrl =
    process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const detailUrl = `${baseUrl}/mypage/scouts/${args.scoutId}`
  const inboxUrl = `${baseUrl}/mypage/scouts`
  const settingsUrl = `${baseUrl}/mypage/notifications/settings`
  const helpUrl = `${baseUrl}/help`
  const expireDate = formatDateJa(args.expiresAt)

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #18181b; color: #facc15; padding: 16px 24px; font-weight: bold; font-size: 18px;">ゲンバキャリア</div>

      <div style="padding: 24px;">
        <p style="font-size: 14px; color: #525252; margin: 0 0 8px;">
          【希望職種】にマッチ！ <strong style="color: #b91c1c;">${escapeHtml(expireDate)}</strong> が期限につき今すぐご確認ください！
        </p>
        <p style="font-size: 12px; color: #737373; margin: 0 0 4px;">
          ※このメールは「ゲンバキャリア」のシステムから自動送信しています。
        </p>
        <p style="font-size: 12px; color: #737373; margin: 0 0 24px;">
          ※この通知メールへご返信いただいても、企業へは届きませんのでご注意ください。
        </p>

        <p style="margin: 0 0 8px;">${escapeHtml(args.userName)} 様</p>
        <p style="margin: 0 0 16px;">
          いつもゲンバキャリアをご利用いただき、ありがとうございます。<br>
          ${escapeHtml(args.userName)} 様に企業からあなたの【希望職種】にマッチした求人のスカウトが届きました。
        </p>

        <p style="margin: 0 0 8px; font-weight: bold;">▼メッセージをチェック</p>
        <p style="margin: 0 0 24px;">
          <a href="${detailUrl}" style="display: inline-block; padding: 12px 24px; background: #f59e0b; color: #18181b; text-decoration: none; border-radius: 6px; font-weight: bold;">
            メッセージを開く
          </a>
        </p>

        <p style="font-size: 14px; margin: 0 0 4px;">メッセージの有効期限：<strong>${escapeHtml(expireDate)}</strong></p>
        <p style="font-size: 12px; color: #737373; margin: 0 0 24px;">
          ※有効期限前に応募を締め切る場合がありますのでお早めにご対応ください。
        </p>

        <div style="border-top: 1px solid #e5e5e5; margin: 24px 0; padding-top: 24px;">
          <p style="margin: 0 0 4px;"><strong>[企業名]</strong> ${escapeHtml(args.companyName)}</p>
          <p style="margin: 0 0 16px;"><strong>[職種名]</strong> ${escapeHtml(args.jobTitle)}</p>

          <p style="font-weight: bold; margin: 0 0 8px;">メッセージの内容</p>
          <p style="margin: 0 0 8px; color: #404040; white-space: pre-line;">${escapeHtml(args.bodyExcerpt)}</p>
          <p style="margin: 0 0 24px;">
            <a href="${detailUrl}" style="color: #2563eb;">▼続きを読む</a>
          </p>
        </div>

        <p style="margin: 0 0 24px;">
          <a href="${inboxUrl}" style="color: #2563eb;">他のスカウトもチェック！</a>
        </p>

        <div style="border-top: 1px solid #e5e5e5; padding-top: 16px;">
          <p style="font-size: 12px; color: #737373; margin: 0 0 4px;">※このメールの配信を停止する場合</p>
          <p style="font-size: 12px; color: #737373; margin: 0 0 24px;">
            <a href="${settingsUrl}" style="color: #2563eb;">通知設定</a>から「スカウト受信メール」を OFF に変更してください。
          </p>
        </div>

        <div style="border-top: 1px solid #e5e5e5; padding-top: 16px; font-size: 12px; color: #737373;">
          <p style="margin: 0 0 4px;"><strong>株式会社LET</strong></p>
          <p style="margin: 0 0 4px;">ゲンバキャリア <a href="${baseUrl}" style="color: #2563eb;">${baseUrl}</a></p>
          <p style="margin: 0;">ヘルプ・よくある質問 <a href="${helpUrl}" style="color: #2563eb;">${helpUrl}</a></p>
        </div>
      </div>
    </div>
  `

  await sendEmail({
    to: args.to,
    subject: args.subject,
    html,
  })
}

/** 日付を「2026年5月21日（木）」形式に整形 */
function formatDateJa(d: Date): string {
  const y = d.getFullYear()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const weekday = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()]
  return `${y}年${m}月${day}日（${weekday}）`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
