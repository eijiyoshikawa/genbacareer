/**
 * Cron / 内部バッチ用エンドポイントの Bearer 認証。
 *
 * - CRON_SECRET 設定時: `Authorization: Bearer ${CRON_SECRET}` と一致しなければ拒否
 * - CRON_SECRET 未設定時:
 *     - production では fail-closed (503) — 設定漏れで誰でも叩ける状態を防ぐ
 *     - development / test では従来どおり素通し (ローカル検証用)
 *
 * @returns 認証失敗時はそのまま返すべき Response、成功時は null
 */
export function verifyCronAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[cron-auth] CRON_SECRET is not set; refusing request")
      return Response.json(
        { error: "CRON_SECRET is not configured" },
        { status: 503 }
      )
    }
    return null
  }
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  return null
}
