"use client"

/**
 * 企業: 採用済応募者の早期退職を報告するボタン + モーダル。
 *
 * 配置: /company/applications/[id] の hired ステータス時のみ表示。
 *
 * クライアントで返金額をプレビュー表示し、確認後 API を叩く。
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle } from "lucide-react"
import {
  calculateMonthsAfterHire,
  refundRateForMonths,
} from "@/lib/early-resignation"

export function EarlyResignationButton({
  applicationId,
  hiredAt,
  originalFeeAmount,
  alreadyReported,
}: {
  applicationId: string
  hiredAt: string
  originalFeeAmount: number
  alreadyReported: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [resignedAt, setResignedAt] = useState("")
  const [note, setNote] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  // プレビュー計算
  const hiredDate = new Date(hiredAt)
  const resignedDate = resignedAt ? new Date(resignedAt) : null
  const previewMonths =
    resignedDate && resignedDate > hiredDate
      ? calculateMonthsAfterHire(hiredDate, resignedDate)
      : 0
  const previewRate = refundRateForMonths(previewMonths)
  const previewAmount = Math.floor((originalFeeAmount * previewRate) / 100)

  if (alreadyReported) {
    return (
      <div className="text-xs text-gray-500">
        戻入申請済 (詳細は admin 確認中)
      </div>
    )
  }

  async function submit() {
    if (!resignedAt) {
      setError("退職日を選択してください")
      return
    }
    if (!confirm("早期退職を報告します。よろしいですか?")) return

    setError("")
    startTransition(async () => {
      try {
        const res = await fetch("/api/company/early-resignations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            resignedAt,
            companyNote: note.trim() || undefined,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error ?? "送信に失敗しました")
          return
        }
        setOpen(false)
        router.refresh()
      } catch {
        setError("通信エラーが発生しました")
      }
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
      >
        <AlertTriangle className="h-3.5 w-3.5" />
        早期退職を報告
      </button>
    )
  }

  return (
    <div className="mt-3 border border-amber-300 bg-amber-50 p-4">
      <h3 className="flex items-center gap-2 font-bold text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        早期退職を報告 (戻入処理)
      </h3>
      <p className="mt-2 text-xs text-amber-900">
        入社後の経過月数に応じて成果報酬の一部が返金されます:
        <br />
        1 ヶ月以内: 80% / 2 ヶ月以内: 50% / 3 ヶ月以内: 20% / 4 ヶ月以降: 対象外
      </p>

      <div className="mt-3 space-y-2">
        <div>
          <label className="block text-xs font-bold text-amber-900">入社日 (固定)</label>
          <p className="mt-0.5 text-sm text-gray-700">
            {hiredDate.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-amber-900">退職日 (必須)</label>
          <input
            type="date"
            value={resignedAt}
            onChange={(e) => setResignedAt(e.target.value)}
            min={hiredAt.slice(0, 10)}
            className="mt-1 block w-full border border-amber-300 px-2 py-1.5 text-sm"
          />
        </div>

        {resignedDate && previewMonths > 0 && (
          <div className="border border-amber-200 bg-white p-3 text-sm">
            <p>
              入社から <strong>{previewMonths} ヶ月</strong> 後の退職
            </p>
            <p>
              返金率: <strong>{previewRate}%</strong>
            </p>
            <p>
              返金額:{" "}
              <strong className="text-amber-700">
                ¥{previewAmount.toLocaleString()}
              </strong>{" "}
              (元 ¥{originalFeeAmount.toLocaleString()})
            </p>
            {previewRate === 0 && (
              <p className="mt-1 text-xs text-red-700">
                ※ 4 ヶ月以降は戻入対象外です
              </p>
            )}
          </div>
        )}

        <div>
          <label className="block text-xs font-bold text-amber-900">
            事情 / 補足 (任意、2000 字以内)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
            rows={3}
            className="mt-1 block w-full border border-amber-300 px-2 py-1.5 text-sm"
            placeholder="退職理由や引継ぎ状況などをお書きください"
          />
        </div>

        {error && (
          <div className="border border-red-300 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !resignedAt || previewRate === 0}
            className="bg-amber-700 px-4 py-2 text-sm font-bold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            {pending ? "送信中..." : "戻入申請を送信"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setError("")
            }}
            className="border border-gray-300 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-warm-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  )
}
