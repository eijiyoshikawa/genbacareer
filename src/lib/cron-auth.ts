/**
 * Cron / 内部バッチエンドポイントの Authorization ヘッダー検証。
 *
 * 本番環境 (NODE_ENV === "production") では CRON_SECRET の設定を必須とする。
 * 未設定のまま本番にデプロイされた場合に fail-open (無認証で誰でも
 * 実行可能) になるのを防ぐため、本番では CRON_SECRET 欠如を 401 として扱う。
 * ローカル開発 / プレビュー環境では、CRON_SECRET を用意しなくても
 * 動作確認できるよう従来通りスキップする。
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production"
  }
  return authHeader === `Bearer ${cronSecret}`
}
