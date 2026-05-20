/**
 * メール送信ヘルパー
 *
 * 本番環境では SendGrid API を使用。
 * 開発環境では console.log にフォールバック。
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

const FROM_NAME = "現場キャリア"

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  )
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const apiKey = process.env.SENDGRID_API_KEY

  if (!apiKey) {
    // Development fallback
    console.log(`[email] To: ${to}`)
    console.log(`[email] Subject: ${subject}`)
    console.log(`[email] Body: ${html}`)
    return { success: true, dev: true }
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: process.env.EMAIL_FROM ?? "noreply@genbacareer.jp",
        name: FROM_NAME,
      },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error(`[email] SendGrid error: ${error}`)
    throw new Error(`Failed to send email: ${response.status}`)
  }

  return { success: true }
}

function wrap(title: string, inner: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>${title}</h2>
      ${inner}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #6b7280; font-size: 12px;">現場キャリア — ノンデスク産業特化型求人サイト</p>
    </div>
  `
}

function ctaButton(label: string, href: string) {
  return `<p><a href="${href}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">${label}</a></p>`
}

/** パスワードリセットメール送信 */
export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${baseUrl()}/reset-password?token=${token}`

  await sendEmail({
    to: email,
    subject: "パスワードリセットのご案内 — 現場キャリア",
    html: wrap(
      "パスワードリセット",
      `
      <p>以下のリンクからパスワードをリセットしてください。</p>
      ${ctaButton("パスワードをリセットする", resetUrl)}
      <p style="color: #6b7280; font-size: 14px;">このリンクは1時間有効です。心当たりがない場合はこのメールを無視してください。</p>
      `
    ),
  })
}

/** メール認証メール送信 */
export async function sendVerificationEmail(email: string, token: string) {
  const verifyUrl = `${baseUrl()}/verify-email?token=${token}`

  await sendEmail({
    to: email,
    subject: "メールアドレスのご確認 — 現場キャリア",
    html: wrap(
      "メールアドレスの確認",
      `
      <p>ご登録ありがとうございます。以下のリンクからメールアドレスを確認してください。</p>
      ${ctaButton("メールアドレスを確認する", verifyUrl)}
      <p style="color: #6b7280; font-size: 14px;">このリンクは24時間有効です。心当たりがない場合はこのメールを無視してください。</p>
      `
    ),
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
    html: wrap(
      "応募が完了しました",
      `
      <p><strong>${companyName}</strong> の <strong>${jobTitle}</strong> に応募が完了しました。</p>
      <p>企業からの返信をお待ちください。</p>
      ${ctaButton("応募状況を確認する", `${baseUrl()}/mypage/applications`)}
      `
    ),
  })
}

/** 新着応募通知メール送信（企業向け） */
export async function sendNewApplicationToCompanyEmail(params: {
  to: string
  jobTitle: string
  applicantName: string
  applicationId: string
}) {
  const { to, jobTitle, applicantName, applicationId } = params
  await sendEmail({
    to,
    subject: `新しい応募が届きました — ${jobTitle}`,
    html: wrap(
      "新しい応募が届きました",
      `
      <p><strong>${applicantName}</strong> さんから <strong>${jobTitle}</strong> へ応募が届きました。</p>
      ${ctaButton("応募内容を確認する", `${baseUrl()}/company/applications`)}
      <p style="color: #6b7280; font-size: 14px;">応募ID: ${applicationId}</p>
      `
    ),
  })
}

const STATUS_LABELS: Record<string, string> = {
  applied: "応募受付",
  reviewing: "選考中",
  interview: "面接調整中",
  offered: "内定",
  hired: "採用",
  rejected: "不採用",
  withdrawn: "辞退",
}

/** 応募ステータス変更通知（求職者向け） */
export async function sendApplicationStatusEmail(params: {
  to: string
  jobTitle: string
  companyName: string
  status: string
}) {
  const { to, jobTitle, companyName, status } = params
  const label = STATUS_LABELS[status] ?? status
  await sendEmail({
    to,
    subject: `応募ステータスが更新されました — ${jobTitle}`,
    html: wrap(
      "応募ステータスが更新されました",
      `
      <p><strong>${companyName}</strong> の <strong>${jobTitle}</strong> への応募ステータスが <strong>${label}</strong> に更新されました。</p>
      ${ctaButton("詳細を確認する", `${baseUrl()}/mypage/applications`)}
      `
    ),
  })
}

/** スカウト通知メール送信（求職者向け） */
export async function sendScoutNotificationEmail(
  email: string,
  companyName: string
) {
  await sendEmail({
    to: email,
    subject: `${companyName} からスカウトが届きました`,
    html: wrap(
      "スカウトが届きました",
      `
      <p><strong>${companyName}</strong> からスカウトメッセージが届いています。</p>
      ${ctaButton("スカウトを確認する", `${baseUrl()}/mypage/scouts`)}
      `
    ),
  })
}

/** 退会完了通知メール送信 */
export async function sendAccountDeletedEmail(email: string) {
  await sendEmail({
    to: email,
    subject: "退会が完了しました — 現場キャリア",
    html: wrap(
      "退会が完了しました",
      `
      <p>現場キャリアをご利用いただきありがとうございました。</p>
      <p>退会処理が完了し、お客様のアカウントは削除されました。</p>
      <p style="color: #6b7280; font-size: 14px;">またのご利用をお待ちしております。</p>
      `
    ),
  })
}

/** お問い合わせ受領メール送信（送信者向け） */
export async function sendContactReceivedEmail(params: {
  to: string
  name: string
  category: string
  body: string
}) {
  const { to, name, category, body } = params
  await sendEmail({
    to,
    subject: "お問い合わせを受け付けました — 現場キャリア",
    html: wrap(
      "お問い合わせを受け付けました",
      `
      <p>${name} 様</p>
      <p>お問い合わせいただきありがとうございます。下記の内容で受付いたしました。</p>
      <p>担当者より追ってご連絡いたします。</p>
      <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0;">
        <p style="margin: 0 0 8px;"><strong>カテゴリ:</strong> ${category}</p>
        <p style="margin: 0; white-space: pre-wrap;">${body}</p>
      </div>
      `
    ),
  })
}

/** お問い合わせ管理者通知 */
export async function sendContactAdminNotification(params: {
  name: string
  email: string
  category: string
  body: string
}) {
  const adminEmail = process.env.CONTACT_ADMIN_EMAIL
  if (!adminEmail) return
  const { name, email, category, body } = params
  await sendEmail({
    to: adminEmail,
    subject: `[お問い合わせ] ${category} — ${name}`,
    html: wrap(
      "新しいお問い合わせ",
      `
      <p><strong>氏名:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>カテゴリ:</strong> ${category}</p>
      <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0; white-space: pre-wrap;">${body}</div>
      `
    ),
  })
}

/** 保存検索条件にマッチする新着求人通知 */
export async function sendSavedSearchMatchEmail(params: {
  to: string
  searchName: string
  matchCount: number
  searchUrl: string
}) {
  const { to, searchName, matchCount, searchUrl } = params
  await sendEmail({
    to,
    subject: `新着求人 ${matchCount} 件 — ${searchName}`,
    html: wrap(
      "新着求人のお知らせ",
      `
      <p>保存した条件「<strong>${searchName}</strong>」に一致する新着求人が <strong>${matchCount} 件</strong> あります。</p>
      ${ctaButton("新着求人を見る", searchUrl)}
      `
    ),
  })
}

/** スカウト返信通知（企業向け） */
export async function sendScoutResponseEmail(params: {
  to: string
  applicantName: string
  response: "replied" | "declined"
  replyMessage: string | null
}) {
  const { to, applicantName, response, replyMessage } = params
  const label = response === "replied" ? "返信" : "辞退"
  await sendEmail({
    to,
    subject: `スカウトに${label}がありました — ${applicantName}`,
    html: wrap(
      `スカウトに${label}がありました`,
      `
      <p><strong>${applicantName}</strong> さんからスカウトへの${label}が届きました。</p>
      ${replyMessage ? `<div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0; white-space: pre-wrap;">${replyMessage}</div>` : ""}
      ${ctaButton("スカウト一覧へ", `${baseUrl()}/company/scouts`)}
      `
    ),
  })
}

/** 応募スレッド新着メッセージ通知 */
export async function sendApplicationMessageEmail(params: {
  to: string
  jobTitle: string
  senderLabel: string
  body: string
  recipient: "seeker" | "company"
}) {
  const { to, jobTitle, senderLabel, body, recipient } = params
  const link =
    recipient === "seeker"
      ? `${baseUrl()}/mypage/applications`
      : `${baseUrl()}/company/applications`
  await sendEmail({
    to,
    subject: `新着メッセージ — ${jobTitle}`,
    html: wrap(
      "新着メッセージがあります",
      `
      <p><strong>${senderLabel}</strong> から <strong>${jobTitle}</strong> の応募スレッドに新着メッセージがあります。</p>
      <div style="background: #f3f4f6; padding: 12px; border-radius: 6px; margin: 16px 0; white-space: pre-wrap;">${body}</div>
      ${ctaButton("スレッドを開く", link)}
      `
    ),
  })
}
