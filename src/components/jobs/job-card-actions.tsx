"use client"

/**
 * JobCard 内のアクションボタン群（お気に入り / 比較追加）をラップするクライアント
 * コンポーネント。
 *
 * JobCard 全体を `<Link>` でくるんでいるため、ボタンをクリックしたときに
 * 求人詳細への遷移が走らないよう `onClick` で stopPropagation を呼ぶ必要がある。
 * Server Component の DOM 要素に直接 `onClick` を渡すと
 * 「Event handlers cannot be passed to Client Component props」で
 * prerender が失敗するため、ここを「子だけが client」として切り出す。
 */
export function JobCardActions({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  )
}
