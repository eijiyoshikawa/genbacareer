import Image from "next/image"
import { getCategoryLabel } from "@/lib/categories"

/**
 * 求人詳細ページの上部に置く帯状のビジュアル。
 *
 * デザイン方針: 大手求人サイト (マイナビ転職等) を踏襲し、装飾アイコンを
 * 排してタイポグラフィ主導にする。ゲンバキャリアらしい「建設業の力強さ」
 * は ネイビー (#14181b) ×イエロー (#f5b400) のソリッドな配色で表現する。
 *
 * - 写真がある求人: 写真を主役にし、下部に黄色アクセント
 * - 写真がない求人 (HW など): ネイビー帯 + 上下黄色ストライプ + カテゴリラベル
 */
export function HeroBanner({
  category,
  photo,
}: {
  category: string
  photo?: string | null
}) {
  const label = getCategoryLabel(category)

  if (photo) {
    return (
      <div className="relative h-32 overflow-hidden bg-ink-900 sm:h-48">
        <Image
          src={photo}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 860px"
          className="object-cover"
          unoptimized={!photo.startsWith("/") && !photo.includes("supabase.co")}
        />
        <div className="absolute inset-x-0 top-0 h-1 bg-brand-yellow-500" />
        <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-yellow-500" />
      </div>
    )
  }

  return (
    <div className="relative h-16 overflow-hidden bg-ink-900 sm:h-20">
      <div className="hero-stripe-top" style={{ height: "4px" }} />
      <div className="hero-stripe-bottom" style={{ height: "4px" }} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold tracking-[0.25em] text-white/90 sm:text-sm">
          {label}
        </span>
      </div>
    </div>
  )
}
