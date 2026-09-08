/**
 * Vercel Cron / 外部スケジューラ向けの共通認証ヘルパー。
 *
 * `Authorization: Bearer ${CRON_SECRET}` を検証する。
 * CRON_SECRET が未設定の場合、本番環境では常に拒否する（フェイルクローズ）。
 * これは Vercel 環境変数の設定漏れ・削除ミスがあった際に、破壊的な操作を含む
 * cron エンドポイント（例: rotate-companies, expire-plans）が誰でも匿名で
 * 叩ける状態になってしまうことを防ぐため。
 * ローカル開発 (NODE_ENV !== "production") では未設定でも許可し、
 * 手元での動作確認の利便性を維持する。
 */
export function isCronAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production"
  }
  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}

export function cronUnauthorizedResponse(): Response {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
