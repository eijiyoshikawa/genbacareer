/**
 * Vercel Cron / 外部スケジューラからの呼び出しを認証する。
 *
 * `CRON_SECRET` が未設定の場合に無条件で通してしまうと、DB を書き換える
 * cron (expire-plans / rotate-companies / hellowork-import 等) が誰でも
 * 叩ける状態になる。Preview 環境や設定漏れで未設定になるケースは十分あり得る
 * ため、本番では未設定なら fail closed（拒否）にする。
 * 開発環境はローカル動作確認の利便性のため、未設定なら従来通り許可する。
 */
export function isCronAuthorized(request: Request): boolean {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return process.env.NODE_ENV !== "production"
  }
  return authHeader === `Bearer ${cronSecret}`
}
