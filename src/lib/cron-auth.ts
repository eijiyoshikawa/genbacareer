/**
 * /api/cron/* および内部専用エンドポイントの Bearer 認証ヘルパ。
 *
 * CRON_SECRET は本番では必須 (scripts/check-env.ts で検証済み) だが、
 * 万一未設定のまま本番にデプロイされた場合に備えてここでは fail-closed にする。
 * `if (cronSecret && authHeader !== ...)` のような書き方は cronSecret が
 * falsy のとき検証自体をスキップしてしまい、誰でも叩けてしまう。
 */
export function isCronAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  return authHeader === `Bearer ${cronSecret}`
}
