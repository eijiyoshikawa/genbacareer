import { randomBytes, randomInt } from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "./db"
import { sendEmail } from "./email"

/** 招待トークン有効期限: 7 日 */
export const INVITATION_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000

/** 招待トークン (64 桁 hex)。User.verificationToken と同形式。 */
export function generateInvitationToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * 直接発行用の仮パスワード。
 * - 12 文字
 * - 英大小 + 数字 + 記号（一部）から少なくとも 1 文字ずつ含む
 * - I/l/O/0/1 など視覚的に紛らわしい文字は除外（手書きメモ前提）
 */
export function generateTemporaryPassword(): string {
  const upper = "ABCDEFGHJKMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnpqrstuvwxyz"
  const digits = "23456789"
  const symbols = "@#$%&*"
  const all = upper + lower + digits + symbols

  const pick = (chars: string) => chars[randomInt(0, chars.length)]

  // 必須 4 文字 + ランダム 8 文字
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  const rest: string[] = []
  for (let i = 0; i < 8; i++) rest.push(pick(all))

  // Fisher-Yates シャッフルで配置をランダム化
  const arr = [...required, ...rest]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr.join("")
}

/** 招待メール送信 */
export async function sendCompanyInviteEmail({
  email,
  companyName,
  token,
}: {
  email: string
  companyName: string
  token: string
}) {
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  const acceptUrl = `${baseUrl}/company/invite/${token}`

  await sendEmail({
    to: email,
    subject: `【ゲンバキャリア】${companyName} の管理者アカウント招待`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>ゲンバキャリアへようこそ</h2>
        <p><strong>${escapeHtml(companyName)}</strong> の管理者アカウントが発行されました。</p>
        <p>以下のリンクからパスワードを設定し、ログインしてください。</p>
        <p>
          <a href="${acceptUrl}" style="display: inline-block; padding: 12px 24px; background: #2563eb; color: white; text-decoration: none; border-radius: 6px;">
            アカウントを有効化する
          </a>
        </p>
        <p style="color: #6b7280; font-size: 14px;">
          このリンクは <strong>7 日間</strong> 有効です。<br>
          心当たりがない場合はこのメールを無視してください。
        </p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          リンクが開けない場合は以下の URL をブラウザに貼り付けてください:<br>
          <span style="word-break: break-all;">${acceptUrl}</span>
        </p>
      </div>
    `,
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

/**
 * トークンを検証し、CompanyInvitation と Company を返す。
 * 期限切れ / 受領済み / 不正トークンは null。
 */
export async function findValidInvitation(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return null
  const inv = await prisma.companyInvitation.findUnique({
    where: { token },
    include: { company: { select: { id: true, name: true } } },
  })
  if (!inv) return null
  if (inv.acceptedAt) return null
  if (inv.expiresAt.getTime() < Date.now()) return null
  return inv
}

/**
 * 招待を accept して CompanyUser を作成する（既に同 email の CompanyUser があれば上書きせずエラー）。
 * トランザクション内で:
 *   1. CompanyUser を作成（passwordHash 設定済み）
 *   2. CompanyInvitation を acceptedAt 更新
 */
export async function acceptInvitation({
  token,
  password,
  name,
}: {
  token: string
  password: string
  name?: string
}): Promise<
  | { ok: true; companyUserId: string }
  | { ok: false; reason: "invalid" | "expired" | "email_taken" }
> {
  const inv = await findValidInvitation(token)
  if (!inv) return { ok: false, reason: "invalid" }

  const existing = await prisma.companyUser.findUnique({
    where: { email: inv.email },
  })
  if (existing) return { ok: false, reason: "email_taken" }

  const passwordHash = await bcrypt.hash(password, 10)

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.companyUser.create({
      data: {
        companyId: inv.companyId,
        email: inv.email,
        passwordHash,
        name: name ?? null,
        role: inv.role,
        mustChangePassword: false,
      },
    })
    await tx.companyInvitation.update({
      where: { id: inv.id },
      data: { acceptedAt: new Date() },
    })
    return user
  })

  return { ok: true, companyUserId: created.id }
}
