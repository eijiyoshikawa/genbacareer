/**
 * /api/cron/* および内部専用 API (seed-article 等) の Bearer CRON_SECRET 認証。
 *
 * 各ルートで `if (cronSecret && authHeader !== ...) return 401` を個別実装していたが、
 * この形は CRON_SECRET が未設定の場合にチェックそのものがスキップされ、
 * 認証なしで叩けてしまう「fail open」になっていた
 * (本番は check-env.ts で CRON_SECRET を必須にしているが、それは
 * デプロイ前の手動チェックであり、設定漏れを機械的に防ぐものではない)。
 *
 * 本番 (NODE_ENV=production) では CRON_SECRET 未設定を「拒否」に倒す
 * (fail closed)。開発環境ではローカル動作確認のため従来どおり未設定なら許可する。
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get("authorization")

  if (!cronSecret) {
    return process.env.NODE_ENV !== "production"
  }

  return authHeader === `Bearer ${cronSecret}`
}
