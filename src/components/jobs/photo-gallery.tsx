import Image from "next/image"

/**
 * 求人 / 企業の写真ギャラリー。最大 12 枚想定。
 * 写真が無い場合は何も描画しない（呼び出し側でセクション全体を非表示にする想定）。
 *
 * モバイル: 2 列、デスクトップ: 3 列のグリッド。aspect-square で揃える。
 */
export function PhotoGallery({
  photos,
  alt = "求人写真",
}: {
  photos: string[]
  alt?: string
}) {
  if (!photos || photos.length === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {photos.slice(0, 12).map((url, i) => (
        <div
          key={`${url}-${i}`}
          className="relative aspect-square overflow-hidden bg-gray-100"
        >
          <Image
            src={url}
            alt={`${alt} ${i + 1}`}
            fill
            sizes="(max-width: 640px) 50vw, 33vw"
            className="object-cover"
            unoptimized={!url.startsWith("/") && !url.includes("supabase.co")}
          />
        </div>
      ))}
    </div>
  )
}
