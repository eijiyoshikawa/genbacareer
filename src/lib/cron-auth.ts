/**
 * cron エンドポイントの Authorization 検証。
 *
 * CRON_SECRET 未設定の場合、開発環境では通すが本番では拒否する (fail-closed)。
 * 設定ミスで更新系 cron が未認証公開されるのを防ぐ。
 */
export function isCronAuthorized(
  cronSecret: string | undefined,
  authHeader: string | null,
): boolean {
  if (!cronSecret) return process.env.NODE_ENV !== "production"
  return authHeader === `Bearer ${cronSecret}`
}
