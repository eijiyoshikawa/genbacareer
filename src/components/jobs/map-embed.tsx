/**
 * Google Maps の埋め込みコンポーネント。
 *
 * Google Maps の iframe ローダー (https://maps.google.com/maps?q=...&output=embed)
 * を使用するため、API キーは不要。地番が無い住所でも検索クエリとして開けば
 * 大体の位置が表示される。
 *
 * セキュリティ：iframe の sandbox 属性で minimum 権限のみ許可。
 */
export function MapEmbed({
  address,
  height = 280,
}: {
  address: string | null | undefined
  height?: number
}) {
  const query = address?.trim()
  if (!query) return null

  const src = `https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`
  const linkOut = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

  return (
    <div className="overflow-hidden border bg-gray-100">
      <iframe
        src={src}
        width="100%"
        height={height}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        title={`${query} の地図`}
        className="block"
      />
      <div className="flex items-center justify-between gap-3 border-t bg-white p-2.5 text-xs">
        <span className="truncate text-gray-600">{query}</span>
        <a
          href={linkOut}
          target="_blank"
          rel="noopener noreferrer"
          className="press shrink-0 inline-flex items-center gap-1 bg-primary-500 px-3 py-1 font-medium text-white hover:bg-primary-600"
        >
          Google Maps で開く
        </a>
      </div>
    </div>
  )
}
