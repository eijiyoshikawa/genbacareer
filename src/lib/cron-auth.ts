/**
 * Vercel Cron / 外部スケジューラ向けの共通認証ヘルパー。
 *
 * `CRON_SECRET` が未設定の場合は誤って本番公開されないよう fail-closed
 * (401 を返す) にする。以前は `cronSecret &&` の短絡評価により
 * 未設定時に認証が完全にスキップされ、何者でも叩けてしまうバグがあった。
 */
export function verifyCronAuth(request: Request): Response | null {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return Response.json(
      { error: "CRON_SECRET is not configured" },
      { status: 500 }
    )
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  return null
}
