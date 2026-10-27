/**
 * Cron エンドポイントの Bearer CRON_SECRET 検証。
 * 本番で CRON_SECRET 未設定の場合は fail-closed（全拒否）。開発環境のみ未設定を許可。
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return request.headers.get("authorization") === `Bearer ${secret}`
}
