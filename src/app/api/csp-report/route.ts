/**
 * POST /api/csp-report
 *
 * next.config.ts の CSP `report-uri` の送信先。ブラウザが CSP 違反
 * （インラインスクリプト注入のブロック等）を検知すると、認証情報無しで
 * ここに `application/csp-report` (または application/json) の POST を
 * 送ってくる。以前は report-uri 自体が未設定で、CSP が何かをブロックして
 * も一切のシグナルが残らなかった。
 *
 * ここではログに残すのみ（Vercel のログ / Sentry のログドレインで拾える）。
 * ブラウザ由来の入力なので、認証・レート制限は行わず常に 204 を返す
 * （失敗させても再送されるだけで意味が無いため）。
 */

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  try {
    const text = await request.text()
    // 極端に大きいレポートでログを埋めないよう切り詰める
    console.warn(`[csp-report] ${text.slice(0, 4000)}`)
  } catch {
    // ボディが読めなくても 204 を返す（ブラウザ側の再送を誘発しない）
  }
  return new Response(null, { status: 204 })
}
