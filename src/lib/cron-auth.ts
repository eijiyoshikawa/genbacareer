/**
 * Cron / 内部エンドポイント共通の Bearer 認証。
 *
 * CRON_SECRET 未設定時:
 *   - 本番 (NODE_ENV=production): 拒否 (fail-closed)。設定漏れで cron が
 *     無認証公開されるのを防ぐ。
 *   - 開発 / テスト: 許可 (ローカルで手軽に叩けるように)。
 */
export function isCronAuthorized(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return authHeader === `Bearer ${secret}`
}
