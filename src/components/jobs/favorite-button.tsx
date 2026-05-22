"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react"

/**
 * 求人カード / 求人詳細 に置くお気に入りトグルボタン。
 * 未ログインは「ログインして保存」ボタンに切替（親カードが <Link> を
 * 内包する場合、<a> のネストを避けるため <Link> ではなく <button> + router.push を使う）。
 */
export function FavoriteButton({
  jobId,
  initialIsFavorite,
  loggedIn,
  size = "sm",
}: {
  jobId: string
  initialIsFavorite: boolean
  loggedIn: boolean
  size?: "sm" | "md"
}) {
  const router = useRouter()
  const [isFav, setIsFav] = useState(initialIsFavorite)
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  const sizeCls = size === "md" ? "h-5 w-5" : "h-4 w-4"

  if (!loggedIn) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          router.push(`/login?callbackUrl=/jobs/${jobId}`)
        }}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-700"
        aria-label="ログインしてお気に入り"
        title="ログインしてお気に入り"
      >
        <Bookmark className={sizeCls} />
      </button>
    )
  }

  async function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    setBusy(true)
    const next = !isFav
    setIsFav(next) // 楽観的
    try {
      const res = await fetch(`/api/users/me/favorites/${jobId}`, {
        method: next ? "POST" : "DELETE",
      })
      if (!res.ok) {
        setIsFav(!next)
      } else {
        startTransition(() => {
          // 一覧ページ等は client cache に依存しないので refresh 不要
        })
      }
    } catch {
      setIsFav(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`inline-flex items-center gap-1 transition disabled:opacity-50 ${
        isFav ? "text-amber-600 hover:text-amber-700" : "text-gray-400 hover:text-amber-600"
      }`}
      aria-label={isFav ? "お気に入りから外す" : "お気に入りに追加"}
      aria-pressed={isFav}
      title={isFav ? "お気に入りから外す" : "お気に入りに追加"}
    >
      {busy ? (
        <Loader2 className={`${sizeCls} animate-spin`} />
      ) : isFav ? (
        <BookmarkCheck className={sizeCls} fill="currentColor" />
      ) : (
        <Bookmark className={sizeCls} />
      )}
    </button>
  )
}
