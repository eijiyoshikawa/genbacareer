/**
 * お問い合わせフォーム送信エンドポイント
 *
 * POST /api/contact
 * Body: { name, email, subject, message }
 *
 * info@let-inc.net 宛にメール転送する。
 * 認証不要（誰でも送信可能）のため、レート制限を厳しめにかける。
 */
import { type NextRequest } from "next/server"
import { z } from "zod"
import { sendEmail } from "@/lib/email"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const CONTACT_TO = "info@let-inc.net"

const schema = z.object({
  name: z.string().min(1, "お名前を入力してください").max(100),
  email: z.string().email("有効なメールアドレスを入力してください"),
  subject: z.string().min(1, "件名を入力してください").max(200),
  message: z.string().min(1, "お問い合わせ内容を入力してください").max(5000),
  // Honeypot — bot のみが埋める想定。値があれば silent reject
  website: z.string().max(200).optional(),
})

export async function POST(request: NextRequest) {
  // レート制限: 同一 IP から 15 分間に 3 回まで（スパム対策）
  const rl = checkRateLimit({
    key: `contact:${getClientIp(request)}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    const firstError =
      parsed.error.issues[0]?.message ?? "入力内容に誤りがあります"
    return Response.json({ error: firstError }, { status: 400 })
  }

  // Honeypot 反応: bot からの送信は silent reject (200 を返してログ記録)
  if (parsed.data.website && parsed.data.website.length > 0) {
    console.info(
      `[contact] honeypot triggered ip=${getClientIp(request)} email=${parsed.data.email}`
    )
    return Response.json({ ok: true, message: "送信しました" })
  }

  const { name, email, subject, message } = parsed.data

  // テキスト本文をエスケープして HTML メールに埋め込む
  const escapedMessage = escapeHtml(message)
  const escapedName = escapeHtml(name)
  const escapedEmail = escapeHtml(email)
  const escapedSubject = escapeHtml(subject)

  try {
    await sendEmail({
      to: CONTACT_TO,
      subject: `[ゲンバキャリア お問い合わせ] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>お問い合わせを受信しました</h2>
          <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb; width: 120px;">お名前</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${escapedName}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;">メール</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${escapedEmail}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #e5e7eb; background: #f9fafb;">件名</td>
              <td style="padding: 8px; border: 1px solid #e5e7eb;">${escapedSubject}</td>
            </tr>
          </table>
          <h3 style="margin-top: 24px;">お問い合わせ内容</h3>
          <div style="white-space: pre-wrap; padding: 16px; border: 1px solid #e5e7eb; background: #f9fafb;">${escapedMessage}</div>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            このメールはゲンバキャリアのお問い合わせフォームから自動送信されています。
            返信は <strong>${escapedEmail}</strong> 宛にお願いします。
          </p>
        </div>
      `,
    })
  } catch (error) {
    console.error("[contact] Failed to send email:", error)
    return Response.json(
      {
        error:
          "送信に失敗しました。しばらく時間を置いてから再度お試しください。",
      },
      { status: 500 }
    )
  }

  return Response.json({
    success: true,
    message: "お問い合わせを受け付けました。担当者よりご連絡いたします。",
  })
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
