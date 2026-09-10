"use client"

/**
 * 請求書発行 / 入金確認のマーク用ボタン。
 *
 * mark_invoiced: モーダルで MF 請求書 ID + invoice URL を任意入力
 * mark_paid: 確認ダイアログのみ
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Action = "mark_invoiced" | "mark_paid" | "mark_failed" | "retry"

export function MarkBillingButton({
  id,
  action,
}: {
  id: string
  action: Action
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [mfId, setMfId] = useState("")
  const [invoiceUrl, setInvoiceUrl] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  const label =
    action === "mark_invoiced"
      ? "発行済をマーク"
      : action === "mark_paid"
        ? "入金確認"
        : action === "retry"
          ? "再試行"
          : "失敗マーク"

  const bgClass =
    action === "mark_invoiced"
      ? "bg-amber-600 hover:bg-amber-700"
      : action === "mark_paid"
        ? "bg-green-600 hover:bg-green-700"
        : action === "retry"
          ? "bg-blue-600 hover:bg-blue-700"
          : "bg-red-600 hover:bg-red-700"

  async function submit() {
    setError("")
    if (action === "mark_paid") {
      if (!confirm("入金確認をマークします。よろしいですか?")) return
    }
    if (action === "retry") {
      if (!confirm("MoneyForward への請求書発行を再試行します。よろしいですか?")) return
    }

    startTransition(async () => {
      try {
        const body: Record<string, string> = { action }
        if (action === "mark_invoiced") {
          if (mfId.trim()) body.mfBillingId = mfId.trim()
          if (invoiceUrl.trim()) body.invoiceUrl = invoiceUrl.trim()
        }
        const res = await fetch(`/api/admin/billing-events/${id}/mark`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error ?? "処理に失敗しました")
          return
        }
        setOpen(false)
        setMfId("")
        setInvoiceUrl("")
        router.refresh()
      } catch {
        setError("通信エラー")
      }
    })
  }

  // mark_paid は即時実行 (モーダル不要)
  if (action !== "mark_invoiced") {
    return (
      <div className="mt-1">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className={`px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${bgClass}`}
        >
          {pending ? "処理中..." : label}
        </button>
        {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
      </div>
    )
  }

  // mark_invoiced はモーダル
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`mt-1 px-3 py-1.5 text-xs font-bold text-white ${bgClass}`}
      >
        {label}
      </button>
    )
  }

  return (
    <div className="mt-2 w-72 space-y-2 border border-amber-300 bg-amber-50 p-3 text-left">
      <div>
        <label className="block text-xs font-bold text-amber-900">
          MF 請求書 ID (任意)
        </label>
        <input
          value={mfId}
          onChange={(e) => setMfId(e.target.value)}
          maxLength={100}
          className="mt-1 block w-full border border-amber-300 px-2 py-1 text-sm"
          placeholder="bil_xxxxx"
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-amber-900">
          請求書 URL (任意)
        </label>
        <input
          value={invoiceUrl}
          onChange={(e) => setInvoiceUrl(e.target.value)}
          maxLength={500}
          className="mt-1 block w-full border border-amber-300 px-2 py-1 text-sm"
          placeholder="https://moneyforward.com/..."
        />
      </div>
      {error && (
        <p className="text-xs text-red-700">{error}</p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className={`px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${bgClass}`}
        >
          {pending ? "送信中..." : "確定"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setError("")
          }}
          className="border border-gray-300 px-3 py-1.5 text-xs"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}
