"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"

type Props = {
  jobId: string
  initial: boolean
  /** Whether the viewer is signed in as a seeker */
  enabled: boolean
}

export function FavoriteButton({ jobId, initial, enabled }: Props) {
  const [isFavorite, setIsFavorite] = useState(initial)
  const [pending, startTransition] = useTransition()

  if (!enabled) {
    return null
  }

  function toggle() {
    startTransition(async () => {
      const target = !isFavorite
      setIsFavorite(target)
      try {
        if (target) {
          await fetch("/api/users/me/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          })
        } else {
          await fetch(`/api/users/me/favorites/${jobId}`, { method: "DELETE" })
        }
      } catch {
        setIsFavorite(!target)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={isFavorite}
      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition ${
        isFavorite
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      <Heart
        className={`h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
      />
      {isFavorite ? "お気に入り済み" : "お気に入りに保存"}
    </button>
  )
}
