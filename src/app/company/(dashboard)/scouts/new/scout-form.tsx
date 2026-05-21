"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SCOUT_BODY_MIN, SCOUT_BODY_MAX } from "@/lib/scouts"

export function ScoutForm({
  jobId,
  userId,
  disabled,
}: {
  jobId: string
  userId: string
  disabled: boolean
}) {
  const router = useRouter()
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const bodyLen = body.length
  const tooShort = bodyLen > 0 && bodyLen < SCOUT_BODY_MIN
  const tooLong = bodyLen > SCOUT_BODY_MAX

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading || disabled) return
    if (tooShort || tooLong || bodyLen === 0) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/company/scouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, userId, body }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました")
        return
      }
      // 送信履歴へリダイレクト
      router.push("/company/scouts")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label className="block text-xs font-bold text-gray-700" htmlFor="scout-body">
          メッセージ本文 ({SCOUT_BODY_MIN} 〜 {SCOUT_BODY_MAX} 文字)
        </label>
        <textarea
          id="scout-body"
          rows={10}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          disabled={disabled || loading}
          placeholder="貴方様のご経歴を拝見し、是非当社でご活躍いただきたくスカウトをお送りさせていただきました。..."
          className="mt-1 block w-full border border-warm-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-warm-50 disabled:text-gray-400"
        />
        <p
          className={`mt-1 text-xs ${
            tooShort || tooLong ? "text-red-600" : "text-gray-500"
          }`}
        >
          {bodyLen} / {SCOUT_BODY_MAX} 文字
          {tooShort && `（最低 ${SCOUT_BODY_MIN} 文字必要です）`}
          {tooLong && `（${SCOUT_BODY_MAX} 文字を超えています）`}
        </p>
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={
          disabled ||
          loading ||
          bodyLen === 0 ||
          tooShort ||
          tooLong
        }
        className="w-full bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "送信中..." : "スカウトを送信"}
      </button>

      <p className="text-xs text-gray-500">
        ※ 件名は固定書式で自動生成されます。本文のみご記入ください。
        <br />
        ※ 同じ求人で同じ求職者への再送は、有効期限切れ後にのみ可能です。
      </p>
    </form>
  )
}
