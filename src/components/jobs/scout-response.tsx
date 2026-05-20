"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Props = {
  scoutId: string
  currentStatus: string
}

export function ScoutResponse({ scoutId, currentStatus }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState<"reply" | "decline" | null>(null)
  const [message, setMessage] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (currentStatus === "replied" || currentStatus === "declined") {
    return (
      <span className="text-xs text-gray-500">
        {currentStatus === "replied" ? "返信済み" : "辞退済み"}
      </span>
    )
  }

  function submit(action: "reply" | "decline") {
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/users/me/scouts/${scoutId}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action,
            message: message.trim() || undefined,
          }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null
          throw new Error(data?.error ?? "送信に失敗しました")
        }
        setOpen(null)
        setMessage("")
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "送信に失敗しました")
      }
    })
  }

  if (open) {
    return (
      <div className="mt-3 rounded-md border bg-white p-3">
        <p className="text-xs font-medium text-gray-700">
          {open === "reply" ? "返信メッセージ" : "辞退の理由（任意）"}
        </p>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder={
            open === "reply"
              ? "ご連絡ありがとうございます。..."
              : "今回は他社で進めているため..."
          }
          className="mt-2 block w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(null)
              setError(null)
            }}
            className="text-xs text-gray-600"
            disabled={pending}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={() => submit(open)}
            disabled={pending || (open === "reply" && !message.trim())}
            className={`rounded-md px-3 py-1 text-xs font-medium text-white disabled:opacity-50 ${
              open === "reply" ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-600 hover:bg-gray-700"
            }`}
          >
            {pending
              ? "送信中..."
              : open === "reply"
                ? "返信する"
                : "辞退する"}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-3 flex gap-2">
      <button
        type="button"
        onClick={() => setOpen("reply")}
        className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
      >
        返信する
      </button>
      <button
        type="button"
        onClick={() => setOpen("decline")}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
      >
        辞退する
      </button>
    </div>
  )
}
