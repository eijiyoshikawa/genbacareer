/**
 * 11.2 マップ検索。
 *
 * 都道府県別の active な求人件数を集計し、Google Maps 上にピンを配置。
 * 各ピンをクリックすると都道府県別の求人一覧 (/[prefecture]) へ遷移。
 *
 * Google Maps API キー (NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) が未設定の場合は
 * テキスト一覧でフォールバック表示する。
 */

import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { PREFECTURE_COORDS, JAPAN_CENTER, JAPAN_ZOOM } from "@/lib/prefecture-coords"
import { JobMapClient } from "./map-client"
import { JobMapFallback } from "./map-fallback"

export const metadata: Metadata = {
  title: "地図で求人を探す",
  description:
    "全国の建設・ノンデスク求人を地図上で確認。都道府県ごとの掲載件数が一目で分かります。",
}

// ビルド時 prerender をスキップ (P2024 回避)。
// /jobs/feed / sitemap.ts と同じ理由: build phase で複数 worker が
// connection_limit=1 環境で接続を奪い合い、prisma.job.groupBy が
// 10s timeout で落ちるため。初回リクエスト時に動的生成 + 短時間キャッシュで運用。
export const dynamic = "force-dynamic"
export const revalidate = 600

export default async function JobMapPage() {
  const rows = await prisma.job.groupBy({
    by: ["prefecture"],
    where: { status: "active" },
    _count: { _all: true },
  })

  const points = rows
    .map((r) => {
      const coords = PREFECTURE_COORDS[r.prefecture]
      if (!coords) return null
      return {
        prefecture: r.prefecture,
        count: r._count._all,
        lat: coords.lat,
        lng: coords.lng,
      }
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .sort((a, b) => b.count - a.count)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""
  const totalJobs = points.reduce((s, p) => s + p.count, 0)

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          地図で求人を探す
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          全国 {totalJobs.toLocaleString()} 件の求人を都道府県別に集計。
          {apiKey
            ? "ピンをクリックすると該当地域の求人一覧へ移動します。"
            : "都道府県を選ぶと該当地域の求人一覧へ移動します。"}
        </p>
      </header>

      {apiKey ? (
        <JobMapClient
          apiKey={apiKey}
          points={points}
          center={JAPAN_CENTER}
          zoom={JAPAN_ZOOM}
        />
      ) : (
        <JobMapFallback
          points={points}
          showSetupNotice={process.env.NODE_ENV !== "production"}
        />
      )}
    </div>
  )
}
