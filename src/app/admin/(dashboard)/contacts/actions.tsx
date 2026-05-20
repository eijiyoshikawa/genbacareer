"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"

export function MarkHandledButton({
  id,
  handled,
}: {
  id: string
  handled: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function toggle() {
    startTransition(async () => {
      await fetch(`/api/admin/contacts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ handled: !handled }),
      })
      router.refresh()
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 rounded-md px-3 py-1 text-xs font-medium disabled:opacity-50 ${
        handled
          ? "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          : "bg-green-600 text-white hover:bg-green-700"
      }`}
    >
      {handled ? "未対応へ戻す" : "対応済みにする"}
    </button>
  )
}
