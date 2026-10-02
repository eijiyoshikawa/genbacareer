import { randomBytes, createHash } from "crypto"

/** Generate a secure random token for password reset */
export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

/**
 * トークンを SHA-256 でハッシュ化する（at-rest 保護）。
 *
 * 平文トークンはメールリンクでのみ扱い、DB にはこのハッシュを保存する。
 * これにより DB が漏洩しても有効なリセットトークンは流出せず、検証は
 * ハッシュ同士の照合（高エントロピー値の決定的ハッシュ）になる。
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

/** Token expiry duration: 1 hour */
export const TOKEN_EXPIRY_MS = 60 * 60 * 1000
