/**
 * Cron / 内部バッチ用の認証チェック。
 *
 * CRON_SECRET が未設定の環境では常に拒否する（フェイルクローズ）。
 * 誤って undefined になった場合に認証がスキップされ、誰でも
 * 求人の失効・請求メール送信・プラン変更などを叩けてしまう事故を防ぐ。
 */
export function verifyCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false

  const authHeader = request.headers.get("authorization")
  return authHeader === `Bearer ${cronSecret}`
}
