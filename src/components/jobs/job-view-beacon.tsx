"use client"

import { useEffect, useRef } from "react"

// 閲覧ポイント付与に必要な最低滞在時間 (ms)。サーバーの POINT_RULES.viewDwellMs と一致させる。
// (points.ts は prisma を import するためクライアントには持ち込まず、ここでは定数で持つ)
const DWELL_MS = 10_000

/**
 * クライアント側で JobView を fire-and-forget 記録するビーコン。
 *
 * - マウント時に 1 回だけ `/api/jobs/[id]/view` を叩く（分析用の閲覧記録）
 * - さらに 10 秒以上同一ページに滞在し続けた場合のみ `{ dwell: true }` を送信
 *   → サーバー側で閲覧ポイントを付与（離脱の早い「ひやかし」閲覧では加点しない）
 * - `navigator.sendBeacon` を優先 (タブを閉じても確実に送信)
 *   なければ `fetch` の keepalive にフォールバック
 * - ボット環境 (navigator.webdriver) は skip
 * - プレビューモード時は呼び出し元が `enabled={false}` で抑制
 */
export function JobViewBeacon({
  jobId,
  enabled = true,
}: {
  jobId: string
  enabled?: boolean
}) {
  const sentRef = useRef(false)

  useEffect(() => {
    if (!enabled) return
    if (sentRef.current) return
    if (typeof navigator !== "undefined" && navigator.webdriver) return
    sentRef.current = true

    const url = `/api/jobs/${encodeURIComponent(jobId)}/view`
    const send = (extra: Record<string, unknown> = {}, keepalive = false) => {
      const payload = JSON.stringify({
        referrer: document.referrer || null,
        pageUrl: window.location.href,
        ...extra,
      })
      try {
        if (!keepalive && typeof navigator !== "undefined" && navigator.sendBeacon) {
          navigator.sendBeacon(url, new Blob([payload], { type: "application/json" }))
          return
        }
      } catch {
        // fall through to fetch
      }
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {})
    }

    // 1) 即時の閲覧記録（分析用）
    send()

    // 2) 10 秒以上の滞在でポイント付与シグナル。タブが隠れている時間はカウントしない。
    let elapsed = 0
    let lastTick = Date.now()
    let pointSent = false
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        elapsed += Date.now() - lastTick
      }
      lastTick = Date.now()
      if (elapsed >= DWELL_MS && !pointSent) {
        pointSent = true
        send({ dwell: true })
        clearInterval(interval)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [jobId, enabled])

  return null
}
