"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type Props = {
  companyId: string
  status: string
  rejectionReason: string | null
}

export function CompanyApprovalActions({
  companyId,
  status,
  rejectionReason,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [reason, setReason] = useState(rejectionReason ?? "")

  async function callApi(action: "approve" | "reject", body?: object) {
    setError("")
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "操作に失敗しました")
        return
      }
      router.refresh()
      setShowRejectForm(false)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 space-y-3">
      {error && (
        <div className="bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {showRejectForm ? (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            却下理由（企業へメールで通知されます）
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={500}
            className="w-full border px-3 py-2 text-sm"
            placeholder="例: 登録内容に不備があります"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => callApi("reject", { reason })}
              className="bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "却下中..." : "却下を確定"}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowRejectForm(false)}
              className="border px-4 py-2 text-sm font-medium hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {status !== "approved" && (
            <button
              type="button"
              disabled={loading}
              onClick={() => callApi("approve")}
              className="bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "処理中..." : "承認する"}
            </button>
          )}
          {status !== "rejected" && (
            <button
              type="button"
              disabled={loading}
              onClick={() => setShowRejectForm(true)}
              className="border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              却下する
            </button>
          )}
          {status === "approved" && (
            <p className="text-sm text-gray-500">
              この企業は承認済みです。求人投稿・スカウト送信が可能な状態です。
            </p>
          )}
        </div>
      )}
    </div>
  )
}
