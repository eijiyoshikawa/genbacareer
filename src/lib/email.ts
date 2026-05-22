/**
 * メール送信ヘルパー
 *
 * 本番環境では SMTP (Gmail Workspace 想定) を使用。
 * 開発環境 / 認証情報が無いときは console.log にフォールバック。
 *
 * 全 10 種類のシステムメールは `email-template.ts` の `renderEmailLayout()` で
 * 共通レイアウトを組み立て、ここでは件名と本文ブロック構成のみを定義する。
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
import {
  renderEmailLayout,
  renderEmailText,
  baseUrl,
  type EmailLayoutOptions,
} from "@/lib/email-template"

interface SendEmailParams {
  to: string
  subject: string
  html: string
  /** プレーンテキスト版 (multipart/alternative で送信)。省略可。 */
  text?: string
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

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
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
      ...(text ? { text } : {}),
    })
    return { success: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error(`[email] SMTP error: ${msg}`)
    throw new Error(`Failed to send email: ${msg}`)
  }
}

/**
 * 共通レイアウトでメールを送信するヘルパ。
 * 各 send*Email 関数はこの関数を通すことで HTML + text の両方が自動生成される。
 */
async function sendLayoutEmail(args: {
  to: string
  subject: string
  layout: EmailLayoutOptions
}) {
  await sendEmail({
    to: args.to,
    subject: args.subject,
    html: renderEmailLayout(args.layout),
    text: renderEmailText(args.layout),
  })
}

/** 管理者通知の宛先 */
const ADMIN_NOTIFY_EMAIL = "info@let-inc.net"

// ============================================================================
// 1) メール確認メール（求職者サインアップ時）
// ============================================================================
export async function sendEmailVerificationEmail(email: string, token: string) {
  const verifyUrl = `${baseUrl()}/verify-email?token=${token}`

  await sendLayoutEmail({
    to: email,
    subject: "メールアドレスのご確認 — ゲンバキャリア",
    layout: {
      preheader: "メールアドレス確認のお願い。24 時間以内に確認してください。",
      paragraphs: [
        "ゲンバキャリアへのご登録ありがとうございます。",
        "以下のボタンからメールアドレスの確認を完了してください。確認が完了するまで、求人への応募はできません。",
        "このリンクは 24 時間有効です。心当たりがない場合はこのメールを無視してください。",
      ],
      cta: { label: "メールアドレスを確認する", url: verifyUrl, variant: "primary" },
      showAutoSendNotice: false,
    },
  })
}

// ============================================================================
// 2) 応募通知メール（企業向け）
// ============================================================================
export async function sendApplicationNotificationEmail(
  toEmail: string,
  jobTitle: string,
  applicantName: string,
  applicationId: string,
) {
  const detailUrl = `${baseUrl()}/company/applications/${applicationId}`

  await sendLayoutEmail({
    to: toEmail,
    subject: `新着応募が届きました — ${jobTitle}`,
    layout: {
      preheader: `${applicantName} さんから「${jobTitle}」へ新しい応募が届きました。`,
      paragraphs: [
        `「${jobTitle}」に ${applicantName} さんから応募がありました。`,
        "速やかなご返信が応募者の納得感に直結します。24 時間以内のご対応を推奨しています。",
      ],
      cta: { label: "応募内容を確認する", url: detailUrl, variant: "primary" },
      kvHeading: "応募情報",
      kv: [
        { label: "求人", value: jobTitle },
        { label: "応募者", value: applicantName },
      ],
    },
  })
}

// ============================================================================
// 3) パスワードリセットメール
// ============================================================================
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${baseUrl()}/reset-password?token=${token}`

  await sendLayoutEmail({
    to: email,
    subject: "パスワードリセットのご案内 — ゲンバキャリア",
    layout: {
      preheader: "パスワードリセットのご依頼を受け付けました。1 時間以内に手続きしてください。",
      paragraphs: [
        "ゲンバキャリア アカウントのパスワードリセットをご依頼いただきました。",
        "以下のボタンから新しいパスワードを設定してください。",
        "このリンクは 1 時間有効です。心当たりがない場合はこのメールを無視してください。あなたのアカウントは安全です。",
      ],
      cta: { label: "パスワードをリセットする", url: resetUrl, variant: "primary" },
      showAutoSendNotice: false,
    },
  })
}

// ============================================================================
// 4) 応募完了通知メール（求職者向け）
// ============================================================================
export async function sendApplicationConfirmEmail(
  email: string,
  jobTitle: string,
  companyName: string,
) {
  await sendLayoutEmail({
    to: email,
    subject: `応募が完了しました — ${jobTitle}`,
    layout: {
      preheader: `${companyName} の ${jobTitle} に応募が完了しました。`,
      paragraphs: [
        `${companyName} の「${jobTitle}」への応募が完了しました。`,
        "企業からの返信が届くまでしばらくお待ちください。",
        "通常 3 営業日以内にステータス変更が発生します。お急ぎの場合はマイページ「応募一覧」から状況をご確認ください。",
      ],
      cta: { label: "応募一覧を見る", url: `${baseUrl()}/mypage/applications`, variant: "primary" },
      kvHeading: "応募情報",
      kv: [
        { label: "企業", value: companyName },
        { label: "求人", value: jobTitle },
      ],
    },
  })
}

// ============================================================================
// 5) 企業登録時 welcome メール（企業担当者宛・status=pending）
// ============================================================================
export async function sendCompanyRegistrationEmail(
  email: string,
  companyName: string,
) {
  await sendLayoutEmail({
    to: email,
    subject: "ご登録ありがとうございます — ゲンバキャリア",
    layout: {
      preheader: "企業登録を受け付けました。1〜2 営業日以内に承認結果をお知らせします。",
      greeting: `${companyName} 様`,
      paragraphs: [
        "ゲンバキャリアへの企業登録ありがとうございます。",
        "現在、運営による登録内容の確認を行っております。通常 1〜2 営業日以内に承認が完了し、求人投稿・スカウト送信などのすべての機能がご利用いただけます。",
        "承認結果は別途このメールアドレス宛にお送りします。ご不明点は info@let-inc.net までご連絡ください。",
      ],
    },
  })
}

// ============================================================================
// 6) 企業登録 管理者通知メール（info@let-inc.net 宛）
// ============================================================================
export async function sendCompanyRegistrationAdminNotification(args: {
  companyId: string
  companyName: string
  industry: string
  prefecture: string
  contactEmail: string
}) {
  const reviewUrl = `${baseUrl()}/admin/companies/${args.companyId}`

  await sendLayoutEmail({
    to: ADMIN_NOTIFY_EMAIL,
    subject: `[ゲンバキャリア] 新規企業登録: ${args.companyName}`,
    layout: {
      preheader: `新規企業登録の承認待ち: ${args.companyName}`,
      paragraphs: ["承認待ちの企業登録が届きました。詳細は以下の通りです。"],
      kvHeading: "登録内容",
      kv: [
        { label: "会社名", value: args.companyName },
        { label: "業種", value: args.industry },
        { label: "都道府県", value: args.prefecture },
        { label: "担当メール", value: args.contactEmail },
      ],
      cta: { label: "管理画面で確認する", url: reviewUrl, variant: "neutral" },
      showAutoSendNotice: false,
    },
  })
}

// ============================================================================
// 7) 企業承認完了の通知メール
// ============================================================================
export async function sendCompanyApprovalEmail(
  email: string,
  companyName: string,
) {
  await sendLayoutEmail({
    to: email,
    subject: "ご登録が承認されました — ゲンバキャリア",
    layout: {
      preheader: "企業登録が承認されました。求人投稿が可能になりました。",
      greeting: `${companyName} 様`,
      paragraphs: [
        "ゲンバキャリアへのご登録が承認されました。",
        "求人投稿・応募者管理・スカウト送信など、すべての機能をご利用いただけます。",
        "まずは求人を投稿して、貴社の魅力を求職者へ届けましょう。",
      ],
      cta: {
        label: "求人を投稿する",
        url: `${baseUrl()}/company/jobs/new`,
        variant: "success",
      },
    },
  })
}

// ============================================================================
// 8) 企業承認却下の通知メール
// ============================================================================
export async function sendCompanyRejectionEmail(
  email: string,
  companyName: string,
  reason?: string | null,
) {
  await sendLayoutEmail({
    to: email,
    subject: "ご登録についてのお知らせ — ゲンバキャリア",
    layout: {
      preheader: "企業登録についてのお知らせです。",
      greeting: `${companyName} 様`,
      paragraphs: [
        "恐れ入りますが、頂戴したご登録内容では本サービスをご利用いただくことができませんでした。",
        reason ? `理由: ${reason}` : null,
        "詳細につきましては info@let-inc.net までお問い合わせください。",
      ],
    },
  })
}

// ============================================================================
// 9) スカウト着信通知メール (求職者向け、マイナビ転職参考の構成)
// ============================================================================
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
  const site = baseUrl()
  const detailUrl = `${site}/mypage/scouts/${args.scoutId}`
  const inboxUrl = `${site}/mypage/scouts`
  const settingsUrl = `${site}/mypage/notifications/settings`

  await sendLayoutEmail({
    to: args.to,
    subject: args.subject,
    layout: {
      preheader: `${args.companyName} からスカウトが届きました。有効期限内に確認してください。`,
      notice: `「${args.jobTitle}」のスカウトが届きました。有効期限内に確認してください。`,
      greeting: `${args.userName} 様`,
      paragraphs: [
        "いつもゲンバキャリアをご利用いただき、ありがとうございます。",
        `${args.userName} 様に企業から、あなたの希望条件にマッチした求人のスカウトが届きました。`,
      ],
      cta: { label: "メッセージを開く", url: detailUrl, variant: "primary" },
      expiresAt: args.expiresAt,
      kvHeading: "求人情報",
      kv: [
        { label: "企業名", value: args.companyName },
        { label: "職種名", value: args.jobTitle },
      ],
      detailSection: { heading: "メッセージの内容", body: args.bodyExcerpt },
      secondaryLink: { label: "他のスカウトもチェック", url: inboxUrl },
      unsubscribe: {
        label: "通知設定から「スカウト受信メール」を OFF にできます",
        url: settingsUrl,
      },
    },
  })
}
