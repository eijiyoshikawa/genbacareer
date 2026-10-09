/**
 * Cron ルートの認可判定。
 * 本番で CRON_SECRET 未設定の場合は fail-closed (全拒否)。
 * 開発/テスト環境では未設定ならスキップ。
 */
export function isCronUnauthorized(
  cronSecret: string | undefined,
  authHeader: string | null
): boolean {
  if (!cronSecret) return process.env.NODE_ENV === "production"
  return authHeader !== `Bearer ${cronSecret}`
}
