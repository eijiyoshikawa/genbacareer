import { randomBytes } from "crypto"

/** Generate a secure random token for password reset / email verification */
export function generateToken(): string {
  return randomBytes(32).toString("hex")
}

/** Password reset token expiry: 1 hour */
export const TOKEN_EXPIRY_MS = 60 * 60 * 1000

/** Email verification token expiry: 24 hours */
export const EMAIL_VERIFY_EXPIRY_MS = 24 * 60 * 60 * 1000
