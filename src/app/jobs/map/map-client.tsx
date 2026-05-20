"use client"

/**
 * Google Maps JS API を動的読み込みして都道府県集計ピンを表示 (11.2)。
 *
 * - npm 依存を増やさず、<script> タグで JS API を読み込む素朴な実装
 * - 件数が多いほどマーカーサイズを大きく見せる
 * - クリックでその都道府県の求人一覧 (/[prefSlug]) へ遷移
 *
 * 環境変数:
 *   NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
 */

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import type { LatLng } from "@/lib/prefecture-coords"
import { getPrefectureSlugByName } from "@/lib/prefecture-slugs"

interface MapPoint {
  prefecture: string
  count: number
  lat: number
  lng: number
}

interface Props {
  apiKey: string
  points: MapPoint[]
  center: LatLng
  zoom: number
}

// Google Maps の型は any 扱い (公式 d.ts は @types/google.maps 追加が必要)
// 必要最小限の型だけローカル定義
type GMap = {
  setCenter: (latlng: LatLng) => void
}
type GMarker = {
  setMap: (m: GMap | null) => void
  addListener: (event: string, cb: () => void) => void
}

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => GMap
        Marker: new (opts: Record<string, unknown>) => GMarker
        InfoWindow: new (opts: Record<string, unknown>) => {
          open: (opts: { anchor: GMarker; map: GMap }) => void
          close: () => void
        }
        Size: new (w: number, h: number) => unknown
        Point: new (x: number, y: number) => unknown
      }
    }
    __initGenbaMap?: () => void
  }
}

const SCRIPT_ID = "google-maps-script"

export function JobMapClient({ apiKey, points, center, zoom }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!mapRef.current) return

    let cancelled = false

    function initMap() {
      if (cancelled) return
      if (!window.google?.maps) {
        setError("Google Maps の読み込みに失敗しました")
        return
      }
      const map = new window.google.maps.Map(mapRef.current!, {
        center,
        zoom,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      })

      const infoWindow = new window.google.maps.InfoWindow({})

      for (const p of points) {
        // 件数に応じてマーカーサイズを変える (件数 0 は除外済み想定)
        const scale = Math.min(24, 10 + Math.log2(Math.max(1, p.count)) * 3)
        const marker = new window.google.maps.Marker({
          position: { lat: p.lat, lng: p.lng },
          map,
          title: `${p.prefecture}: ${p.count} 件`,
          icon: {
            path: 0, // google.maps.SymbolPath.CIRCLE
            scale,
            fillColor: "#f37524", // primary-500
            fillOpacity: 0.8,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
        })

        marker.addListener("click", () => {
          const slug = getPrefectureSlugByName(p.prefecture)
          infoWindow.close()
          const html = `<div style="font-family:sans-serif;padding:2px 4px;">
            <div style="font-weight:bold;font-size:14px;color:#111;">${p.prefecture}</div>
            <div style="font-size:12px;color:#555;">${p.count.toLocaleString()} 件の求人</div>
            ${
              slug
                ? `<a href="/${slug}" style="display:inline-block;margin-top:6px;font-size:12px;color:#e25c0e;text-decoration:underline;">求人一覧を見る →</a>`
                : ""
            }
          </div>`
          // InfoWindow に HTML を渡す
          ;(infoWindow as unknown as { setContent: (s: string) => void }).setContent(html)
          infoWindow.open({ anchor: marker, map })
          // SPA 内遷移 (anchor の onClick がフォロー可能になるよう少し遅延)
          if (slug) {
            setTimeout(() => {
              const a = document.querySelector<HTMLAnchorElement>(
                `a[href="/${slug}"]`
              )
              if (a) {
                a.addEventListener(
                  "click",
                  (e) => {
                    e.preventDefault()
                    router.push(`/${slug}`)
                  },
                  { once: true }
                )
              }
            }, 50)
          }
        })
      }
    }

    if (window.google?.maps) {
      initMap()
      return
    }

    if (document.getElementById(SCRIPT_ID)) {
      // ロード中の別タブ。コールバックで拾う
      const prev = window.__initGenbaMap
      window.__initGenbaMap = () => {
        prev?.()
        initMap()
      }
      return
    }

    window.__initGenbaMap = initMap
    const s = document.createElement("script")
    s.id = SCRIPT_ID
    s.async = true
    s.defer = true
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=__initGenbaMap&v=weekly`
    s.onerror = () => setError("Google Maps スクリプトの読み込みに失敗しました")
    document.head.appendChild(s)

    return () => {
      cancelled = true
    }
  }, [apiKey, points, center, zoom, router])

  return (
    <div className="space-y-2">
      <div
        ref={mapRef}
        className="h-[70vh] w-full border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-900"
        aria-label="求人マップ"
      />
      {error && (
        <div className="border bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-200">
          {error}
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        マーカーをクリックすると、その地域の求人一覧へ移動します。
        マーカーの大きさは掲載件数に比例しています。
      </p>
    </div>
  )
}
