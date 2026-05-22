/**
 * TOTP (RFC 6238) ヘルパー。otplib v13 の functional API をラップして
 * 設定一貫性・サービス名・recovery code 生成を集約する。
 */

import {
  generateSecret,
  generateSync,
  verifySync,
  generateURI,
} from "otplib"
import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"

const SERVICE_NAME = "ゲンバキャリア"

// 30 秒ステップ、6 桁。クロックドリフトに ±1 ステップ猶予。
const COMMON = {
  digits: 6 as const,
  period: 30,
  epochTolerance: 30 as const,
}

export function generateTotpSecret(): string {
  return generateSecret({ length: 20 })
}

export function buildOtpAuthUrl(email: string, secret: string): string {
  return generateURI({
    issuer: SERVICE_NAME,
    label: email,
    secret,
    digits: COMMON.digits,
    period: COMMON.period,
  })
}

export function verifyTotp(token: string, secret: string): boolean {
  if (!/^\d{6}$/.test(token)) return false
  try {
    const result = verifySync({
      token,
      secret,
      digits: COMMON.digits,
      period: COMMON.period,
      epochTolerance: COMMON.epochTolerance,
    })
    return result.valid === true
  } catch {
    return false
  }
}

// デバッグ用に現在のコードを生成
export function currentCode(secret: string): string {
  return generateSync({
    secret,
    digits: COMMON.digits,
    period: COMMON.period,
  })
}

/**
 * 1 回限りリカバリコード 8 件を生成。
 * @returns plain（ユーザーに 1 度だけ見せる） + hashed（DB 保存用）
 */
export async function generateRecoveryCodes(): Promise<{
  plain: string[]
  hashed: string[]
}> {
  const plain = Array.from({ length: 8 }, () => formatCode(randomBytes(5)))
  const hashed = await Promise.all(plain.map((c) => bcrypt.hash(c, 10)))
  return { plain, hashed }
}

function formatCode(buf: Buffer): string {
  const hex = buf.toString("hex").toUpperCase()
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 10)}`
}

/**
 * リカバリコードを照合し、消費。一致するものがあれば残り 7 件を返す。
 */
export async function consumeRecoveryCode(
  input: string,
  hashedCodes: string[]
): Promise<{ remaining: string[] } | null> {
  const normalized = input.trim().toUpperCase()
  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(normalized, hashedCodes[i])) {
      const remaining = hashedCodes.filter((_, j) => j !== i)
      return { remaining }
    }
  }
  return null
}
