"use client"

import { useEffect, useRef, useState, useTransition } from "react"

type Message = {
  id: string
  senderKind: string
  body: string
  createdAt: string
}

type Props = {
  applicationId: string
  initial: Message[]
  viewerKind: "seeker" | "company"
  disabled?: boolean
}

export function MessageThread({
  applicationId,
  initial,
  viewerKind,
  disabled = false,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initial)
  const [body, setBody] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length])

  function send() {
    const trimmed = body.trim()
    if (!trimmed) return
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/applications/${applicationId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: trimmed }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null
          throw new Error(data?.error ?? "送信に失敗しました")
        }
        const data = (await res.json()) as { message: Message }
        setMessages((prev) => [...prev, data.message])
        setBody("")
      } catch (e) {
        setError(e instanceof Error ? e.message : "送信に失敗しました")
      }
    })
  }

  return (
    <div>
      <div className="max-h-96 space-y-3 overflow-y-auto rounded-md border bg-gray-50 p-3">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-gray-400">
            まだメッセージがありません
          </p>
        ) : (
          messages.map((m) => {
            const isMine =
              (viewerKind === "seeker" && m.senderKind === "seeker") ||
              (viewerKind === "company" && m.senderKind === "company")
            return (
              <div
                key={m.id}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                    isMine
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-900 border"
                  }`}
                >
                  {m.body}
                  <div
                    className={`mt-1 text-[10px] ${isMine ? "text-blue-100" : "text-gray-400"}`}
                  >
                    {new Date(m.createdAt).toLocaleString("ja-JP")}
                  </div>
                </div>
              </div>
            )
          })
        )}
        <div ref={endRef} />
      </div>

      {!disabled && (
        <div className="mt-3">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={5000}
            placeholder="メッセージを入力..."
            className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={send}
              disabled={pending || !body.trim()}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
            >
              {pending ? "送信中..." : "送信"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
