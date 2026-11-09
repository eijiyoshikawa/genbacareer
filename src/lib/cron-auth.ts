/**
 * cron / 管理用エンドポイントの Bearer 認証。
 *
 * CRON_SECRET 未設定時に「認証なしで通す」と本番で誰でも cron を叩ける
 * (fail-open) ため、本番では未設定=拒否 (fail-closed)。
 * 開発 / テスト環境では未設定でも通す。
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return request.headers.get("authorization") === `Bearer ${secret}`
}
