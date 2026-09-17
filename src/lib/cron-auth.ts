/**
 * Cron / 内部バッチ用の共通認証チェック。
 *
 * CRON_SECRET が未設定の環境では従来「チェックをスキップして通す」実装が
 * 各 route に個別にコピペされていたが、これは fail-open（設定漏れがあると
 * 誰でも叩ける）なので、必ず fail-closed（未設定なら拒否）にする。
 */
export function requireCronAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error("[cron-auth] CRON_SECRET is not configured; rejecting request")
    return Response.json({ error: "cron_not_configured" }, { status: 500 })
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
