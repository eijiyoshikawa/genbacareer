/**
 * Cron エンドポイントの認可判定。
 * - CRON_SECRET 設定済み: Bearer 一致が必須
 * - 未設定: 本番 (NODE_ENV=production) では拒否 (fail-closed)、開発では許可
 */
export function isCronAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return process.env.NODE_ENV !== "production"
  return request.headers.get("authorization") === `Bearer ${secret}`
}
