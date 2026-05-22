"use client"

import { useEffect, useRef } from "react"

/**
 * クライアント側で JobView を fire-and-forget 記録するビーコン。
 *
 * - マウント時に 1 回だけ `/api/jobs/[id]/view` を叩く
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
    const payload = JSON.stringify({
      referrer: document.referrer || null,
      pageUrl: window.location.href,
    })

    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: "application/json" })
        navigator.sendBeacon(url, blob)
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
    }).catch(() => {
      // ignore — best effort
    })
  }, [jobId, enabled])

  return null
}
