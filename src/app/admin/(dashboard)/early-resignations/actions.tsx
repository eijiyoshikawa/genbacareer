"use client"

/**
 * 戻入申請の admin アクション (承認 / 却下 / 返金処理済マーク)。
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function EarlyResignationActions({
  id,
  status,
}: {
  id: string
  status: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [showApproveForm, setShowApproveForm] = useState(false)
  const [showInvoicedForm, setShowInvoicedForm] = useState(false)
  const [note, setNote] = useState("")
  const [mfId, setMfId] = useState("")
  const [error, setError] = useState("")

  async function call(body: object) {
    setError("")
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          const res = await fetch(`/api/admin/early-resignations/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
          const data = await res.json().catch(() => ({}))
          if (!res.ok) {
            setError(data.error ?? "処理に失敗しました")
            resolve()
            return
          }
          router.refresh()
          setShowRejectForm(false)
          setShowApproveForm(false)
          setShowInvoicedForm(false)
          setNote("")
          setMfId("")
          resolve()
        } catch {
          setError("通信エラー")
          resolve()
        }
      })
    })
  }

  if (status === "reported") {
    return (
      <div className="space-y-2">
        {!showApproveForm && !showRejectForm && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowApproveForm(true)}
              className="bg-green-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-green-700"
            >
              承認
            </button>
            <button
              type="button"
              onClick={() => setShowRejectForm(true)}
              className="border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
            >
              却下
            </button>
          </div>
        )}

        {showApproveForm && (
          <div className="space-y-2 border border-green-300 bg-green-50 p-3">
            <label className="block text-xs font-bold text-green-900">
              admin メモ (任意)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="block w-full border border-green-300 px-2 py-1.5 text-sm"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  call({ action: "approve", adminNote: note || undefined })
                }
                className="bg-green-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                承認を確定
              </button>
              <button
                type="button"
                onClick={() => setShowApproveForm(false)}
                className="border border-gray-300 px-3 py-1.5 text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {showRejectForm && (
          <div className="space-y-2 border border-red-300 bg-red-50 p-3">
            <label className="block text-xs font-bold text-red-900">
              却下理由 (必須)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="block w-full border border-red-300 px-2 py-1.5 text-sm"
              placeholder="申請内容の不備や対象外の理由を記入してください"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending || !note.trim()}
                onClick={() =>
                  call({ action: "reject", adminNote: note.trim() })
                }
                className="bg-red-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                却下を確定
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="border border-gray-300 px-3 py-1.5 text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    )
  }

  if (status === "approved") {
    return (
      <div className="space-y-2">
        {!showInvoicedForm ? (
          <button
            type="button"
            onClick={() => setShowInvoicedForm(true)}
            className="bg-blue-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-blue-700"
          >
            返金書発行済をマーク
          </button>
        ) : (
          <div className="space-y-2 border border-blue-300 bg-blue-50 p-3">
            <label className="block text-xs font-bold text-blue-900">
              MoneyForward credit note ID (任意)
            </label>
            <input
              value={mfId}
              onChange={(e) => setMfId(e.target.value)}
              maxLength={100}
              className="block w-full border border-blue-300 px-2 py-1.5 text-sm"
              placeholder="cn_xxxxx"
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  call({
                    action: "mark_invoiced",
                    mfCreditNoteId: mfId.trim() || undefined,
                  })
                }
                className="bg-blue-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
              >
                発行済をマーク
              </button>
              <button
                type="button"
                onClick={() => setShowInvoicedForm(false)}
                className="border border-gray-300 px-3 py-1.5 text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-700">{error}</p>}
      </div>
    )
  }

  return null
}
