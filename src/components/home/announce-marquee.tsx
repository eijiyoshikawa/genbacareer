import Link from "next/link"

type Announcement = {
  /** YYYY-MM-DD */
  date: string
  label: string
  href?: string
}

/**
 * お知らせを 1 行で右→左に流すマーキー。
 * 検索セクションと「様々な切り口から探す」の間に置く想定。
 * CSS アニメーションのみ（JS 不要）。hover で一時停止。
 */
export function AnnounceMarquee({ items }: { items: Announcement[] }) {
  if (items.length === 0) return null
  // シームレスループのため 2 周分を並べる（CSS は -50% 移動）
  const loop = [...items, ...items]

  return (
    <div className="bg-ink-900 text-white">
      <div className="mx-auto flex max-w-7xl items-center">
        <span className="z-10 shrink-0 bg-brand-yellow-500 px-3 py-1.5 text-xs font-extrabold tracking-wide text-ink-900">
          お知らせ
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="marquee-track flex w-max whitespace-nowrap">
            {loop.map((a, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-6 py-1.5 text-xs"
              >
                <span className="font-mono text-white/45">{a.date}</span>
                {a.href ? (
                  <Link href={a.href} className="text-white/90 hover:underline">
                    {a.label}
                  </Link>
                ) : (
                  <span className="text-white/90">{a.label}</span>
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
