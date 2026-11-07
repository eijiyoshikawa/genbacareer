/**
 * ホームページ + 主要ページの CDN キャッシュとラムダをウォームに保つ。
 *
 * Vercel Cron Jobs から GET で 5 分おきに呼び出す。
 * Authorization ヘッダーで CRON_SECRET を検証。
 *
 * 動作:
 *   各 URL を順に fetch して ISR キャッシュを生成・延長する。
 *   PageSpeed や初回訪問のユーザーが必ずホット lambda の応答を受けられるようにする。
 */

import { isCronAuthorized } from "@/lib/cron-auth"

const TARGETS = ["/", "/jobs", "/journal"] as const

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  // NEXT_PUBLIC_BASE_URL は canonical 用に apex (genbacareer.jp) を指している
  // ことが多いが、cron が apex を叩くと 301 で www に転送される 1 hop が無駄。
  // ここでは canonical の www を直接叩く。preview 等で別ホストに向けたい場合は
  // WARMUP_BASE_URL を上書きで設定する。
  const baseUrl =
    process.env.WARMUP_BASE_URL ??
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production" &&
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "https://www.genbacareer.jp")

  const results = await Promise.all(
    TARGETS.map(async (path) => {
      const start = Date.now()
      try {
        const res = await fetch(`${baseUrl}${path}`, {
          headers: { "User-Agent": "genbacareer-warmup-cron/1.0" },
          cache: "no-store",
        })
        return { path, status: res.status, ms: Date.now() - start }
      } catch (e) {
        return {
          path,
          error: e instanceof Error ? e.message : String(e),
          ms: Date.now() - start,
        }
      }
    })
  )

  return Response.json({ ok: true, results })
}
