/**
 * ゲンバキャリア 簡易ロードテスト (k6 用).
 *
 * 実行方法:
 *   brew install k6                      # 初回のみ
 *   k6 run scripts/loadtest/genbacareer.js
 *
 * 環境変数でターゲット URL を切替:
 *   BASE_URL=https://www.genbacareer.jp k6 run scripts/loadtest/genbacareer.js
 *   (デフォルト: http://localhost:3000)
 *
 * シナリオ:
 *   - 段階的に最大 50 VU (仮想ユーザ) まで負荷を上げる
 *   - 主要公開ページ (/, /jobs, /jobs.xml, /[prefecture], /jobs/[id]) を巡回
 *   - 1 ラン 約 3 分間
 *
 * SLO (本ファイルで監視):
 *   - p95 応答時間 < 1500ms
 *   - http エラーレート < 1%
 *
 * 注意:
 *   - 本番 DB を直接叩くので Vercel の Speed Insights や Sentry に
 *     大量データが流れる。リリース直前の準備テストとして 1 回だけ走らせる想定。
 *   - middleware の UA ブロック (curl 等) を回避するため User-Agent を Mozilla 系にする。
 */

import http from "k6/http"
import { check, sleep } from "k6"
import { Rate } from "k6/metrics"

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000"

// 巡回対象パス (代表的な公開ページ)
const PATHS = [
  "/",
  "/jobs",
  "/jobs?q=東京",
  "/jobs?category=construction",
  "/jobs.xml",
  "/tokyo",
  "/tokyo/construction",
  "/categories/construction",
  "/journal",
  "/sitemap.xml",
  "/robots.txt",
]

const errorRate = new Rate("errors")

export const options = {
  // ステージ: 30s で 10 VU → 1m で 50 VU → 30s で 0 VU
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    // 本番投入前の最低限ライン。NG ならスケール検討。
    http_req_duration: ["p(95)<1500"],
    errors: ["rate<0.01"],
  },
  // 静的画像取得まで含めるとノイズが大きいので無効化
  noConnectionReuse: false,
  userAgent:
    "Mozilla/5.0 (compatible; k6-loadtest/1.0; +https://www.genbacareer.jp/)",
}

export default function () {
  const path = PATHS[Math.floor(Math.random() * PATHS.length)]
  const url = `${BASE_URL}${path}`

  const res = http.get(url, {
    headers: { Accept: "text/html,application/xhtml+xml,application/xml;q=0.9" },
    timeout: "30s",
  })

  const ok = check(res, {
    "status is 200 or 304": (r) => r.status === 200 || r.status === 304,
    "response time < 3s": (r) => r.timings.duration < 3000,
  })

  errorRate.add(!ok)

  // 同一 VU の連続リクエスト間に小休止 (現実的なユーザ行動)
  sleep(Math.random() * 2 + 1) // 1-3 秒
}
