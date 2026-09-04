/**
 * `/api/cron/*` (および CRON_SECRET で保護する管理系ワンオフ) ルート共通の認証チェック。
 *
 * fail-closed: CRON_SECRET が未設定の環境（例: Preview に環境変数を反映し忘れた場合）でも
 * 常に拒否する。「未設定なら無制限」という fail-open な判定は、Vercel Cron 以外の
 * 第三者からも叩けてしまうため採用しない。
 */
export function isValidCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}
