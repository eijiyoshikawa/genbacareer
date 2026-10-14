/**
 * cron / 内部 API 用の Bearer 認証。
 *
 * CRON_SECRET 未設定時、本番では fail-closed (認証失敗) とする。
 * 開発・テスト環境では従来どおり未設定なら通す。
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return request.headers.get("authorization") === `Bearer ${secret}`
}
