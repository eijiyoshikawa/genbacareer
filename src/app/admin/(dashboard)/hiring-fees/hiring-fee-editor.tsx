"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { HIRING_FEE_MIN, HIRING_FEE_MAX } from "@/lib/hiring-fee"
import { HIRING_FEE_AMOUNT } from "@/lib/hiring-fee"

/**
 * 求人別 成果報酬単価のインライン編集。
 * - 空欄で保存 → NULL (フォールバック適用)
 * - 数値入力 → PATCH /api/admin/jobs/[id]/hiring-fee
 */
export function HiringFeeEditor({
  jobId,
  initialValue,
}: {
  jobId: string
  initialValue: number | null
}) {
  const router = useRouter()
  const [value, setValue] = useState<string>(
    initialValue != null ? String(initialValue) : "",
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isDirty = (value === "" ? null : Number(value)) !== initialValue

  async function handleSave() {
    setBusy(true)
    setError(null)
    const numeric = value.trim() === "" ? null : Number(value.replace(/,/g, ""))

    if (numeric !== null) {
      if (!Number.isInteger(numeric)) {
        setError("整数で入力してください")
        setBusy(false)
        return
      }
      if (numeric < HIRING_FEE_MIN || numeric > HIRING_FEE_MAX) {
        setError(
          `${HIRING_FEE_MIN.toLocaleString()} 〜 ${HIRING_FEE_MAX.toLocaleString()} 円`,
        )
        setBusy(false)
        return
      }
    }

    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/hiring-fee`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hiringFeeAmount: numeric }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-500">¥</span>
        <input
          type="number"
          inputMode="numeric"
          min={HIRING_FEE_MIN}
          max={HIRING_FEE_MAX}
          step={1000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={HIRING_FEE_AMOUNT.toLocaleString()}
          className="w-28 border border-gray-300 px-2 py-1 text-sm tabular-nums focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>
      <button
        type="button"
        onClick={handleSave}
        disabled={busy || !isDirty}
        className="press inline-flex items-center px-2 py-1 text-xs font-medium border border-primary-300 bg-white text-primary-700 hover:bg-primary-50 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? "..." : "保存"}
      </button>
      {initialValue == null && !isDirty && (
        <span className="text-[11px] text-gray-400">既定値</span>
      )}
      {error && <span className="text-[11px] text-rose-600">{error}</span>}
    </div>
  )
}
