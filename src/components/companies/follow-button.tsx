"use client"

import { useState } from "react"
import Link from "next/link"
import { Star, Loader2 } from "lucide-react"

export function CompanyFollowButton({
  companyId,
  initialFollowing,
  loggedIn,
}: {
  companyId: string
  initialFollowing: boolean
  loggedIn: boolean
}) {
  const [following, setFollowing] = useState(initialFollowing)
  const [busy, setBusy] = useState(false)

  if (!loggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=/companies/${companyId}`}
        className="press inline-flex items-center gap-1.5 border border-amber-300 bg-white hover:bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700"
      >
        <Star className="h-3.5 w-3.5" />
        ログインしてフォロー
      </Link>
    )
  }

  async function toggle() {
    setBusy(true)
    const next = !following
    setFollowing(next) // 楽観的
    try {
      const res = await fetch(`/api/users/me/company-follows/${companyId}`, {
        method: next ? "POST" : "DELETE",
      })
      if (!res.ok) setFollowing(!next)
    } catch {
      setFollowing(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`press inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
        following
          ? "bg-amber-500 text-white hover:bg-amber-600"
          : "border border-amber-300 bg-white text-amber-700 hover:bg-amber-50"
      }`}
      aria-pressed={following}
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Star
          className="h-3.5 w-3.5"
          fill={following ? "currentColor" : "none"}
        />
      )}
      {following ? "フォロー中" : "フォローして新着通知"}
    </button>
  )
}
