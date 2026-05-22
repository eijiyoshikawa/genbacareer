import Link from "next/link"

/**
 * 求人詳細ページ右側のセクション目次ナビ。
 * デスクトップでは sticky 表示、モバイルでは非表示。
 *
 * 各セクションには対応する id（例: `id="features"`）を付けておく必要がある。
 */
export function RightTocNav({
  items,
}: {
  items: Array<{ id: string; label: string }>
}) {
  if (items.length === 0) return null

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="sticky top-20 border bg-white shadow-sm overflow-hidden">
        <h3 className="px-4 py-3 text-sm font-bold text-gray-700 border-b bg-gray-50">
          求人詳細
        </h3>
        <ul>
          {items.map((it, i) => (
            <li key={it.id}>
              <Link
                href={`#${it.id}`}
                className={`block px-4 py-2.5 text-sm border-l-2 transition-colors hover:bg-primary-50 hover:text-primary-700 ${
                  i === 0
                    ? "border-primary-500 text-primary-700 font-medium bg-primary-50"
                    : "border-transparent text-gray-600"
                }`}
              >
                {it.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  )
}
