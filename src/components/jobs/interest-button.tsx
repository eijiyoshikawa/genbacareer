"use client"

/**
 * 12.3 気になるボタン。
 *
 * お気に入り (FavoriteButton) と並列で表示する「ライト応募」UI。
 * クリック → POST /api/users/me/interests/[jobId]
 *
 * デザイン方針: お気に入り = 自分のためのブックマーク、
 * 気になる = 企業へのソフトな興味表明 (企業側ダッシュボードで表示)
 */

import { useState } from "react"
import Link from "next/link"
import { Eye, Loader2 } from "lucide-react"

interface Props {
  jobId: string
  initialInterested: boolean
  loggedIn: boolean
  /** subtle なリンク風 (job 詳細用) / button 風 (一覧用) を選択 */
  variant?: "link" | "button"
}

export function InterestButton({
  jobId,
  initialInterested,
  loggedIn,
  variant = "button",
}: Props) {
  const [interested, setInterested] = useState(initialInterested)
  const [busy, setBusy] = useState(false)

  if (!loggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=/jobs/${jobId}`}
        className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600"
      >
        <Eye className="h-3.5 w-3.5" />
        ログインして気になる
      </Link>
    )
  }

  async function toggle() {
    setBusy(true)
    const next = !interested
    setInterested(next)
    try {
      const res = await fetch(`/api/users/me/interests/${jobId}`, {
        method: next ? "POST" : "DELETE",
      })
      if (!res.ok) setInterested(!next)
    } catch {
      setInterested(!next)
    } finally {
      setBusy(false)
    }
  }

  if (variant === "link") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={interested}
        className={`inline-flex items-center gap-1 text-xs transition disabled:opacity-50 ${
          interested
            ? "text-purple-600 hover:text-purple-700 font-medium"
            : "text-gray-500 hover:text-purple-600"
        }`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
        {interested ? "気になる中" : "気になる"}
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={interested}
      className={`press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
        interested
          ? "bg-purple-600 text-white hover:bg-purple-700"
          : "border border-purple-300 bg-white text-purple-700 hover:bg-purple-50"
      }`}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Eye className="h-3.5 w-3.5" />
      )}
      {interested ? "気になる中" : "気になる"}
    </button>
  )
}
