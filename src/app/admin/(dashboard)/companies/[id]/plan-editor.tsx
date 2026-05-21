"use client"

/**
 * 管理者が企業の掲載プランを変更する UI。
 *
 * - PlanType の選択 (5 種)
 * - planPaidUntil (月額/SNS のみ表示)
 * - planActivatedAt (任意)
 * - planPrepaidFull (一括前払いフラグ)
 * - planNotes (admin メモ)
 *
 * 変更は POST /api/admin/companies/[id]/plan に投げる。
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  PLAN_TYPES,
  PLAN_LABELS,
  type PlanType,
  isPlanType,
} from "@/lib/plans"

export function PlanEditor({
  companyId,
  initial,
}: {
  companyId: string
  initial: {
    planType: string
    planPaidUntil: string | null
    planActivatedAt: string | null
    planPrepaidFull: boolean
    planNotes: string | null
  }
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [planType, setPlanType] = useState<PlanType>(
    isPlanType(initial.planType) ? initial.planType : "success_fee",
  )
  const [paidUntil, setPaidUntil] = useState(
    initial.planPaidUntil ? initial.planPaidUntil.slice(0, 10) : "",
  )
  const [activatedAt, setActivatedAt] = useState(
    initial.planActivatedAt ? initial.planActivatedAt.slice(0, 10) : "",
  )
  const [prepaidFull, setPrepaidFull] = useState(initial.planPrepaidFull)
  const [notes, setNotes] = useState(initial.planNotes ?? "")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const needsExpiry =
    planType === "monthly_12" ||
    planType === "monthly_24" ||
    planType === "sns_client"

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (pending) return
    setError("")
    setSuccess(false)

    if (needsExpiry && !paidUntil) {
      setError("月額プラン / SNS 枠は期限日が必須です")
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/companies/${companyId}/plan`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planType,
            planPaidUntil: needsExpiry ? paidUntil : null,
            planActivatedAt: activatedAt || null,
            planPrepaidFull: prepaidFull,
            planNotes: notes.trim() || null,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          setError(data.error ?? "更新に失敗しました")
          return
        }
        setSuccess(true)
        router.refresh()
      } catch {
        setError("通信エラーが発生しました")
      }
    })
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div>
        <label className="block text-xs font-bold text-gray-700">プラン種別</label>
        <select
          value={planType}
          onChange={(e) => setPlanType(e.target.value as PlanType)}
          className="mt-1 block w-full border border-gray-300 px-2 py-1.5 text-sm"
        >
          {PLAN_TYPES.map((t) => (
            <option key={t} value={t}>
              {PLAN_LABELS[t]}
            </option>
          ))}
        </select>
      </div>

      {needsExpiry && (
        <div>
          <label className="block text-xs font-bold text-gray-700">契約終了日 (必須)</label>
          <input
            type="date"
            value={paidUntil}
            onChange={(e) => setPaidUntil(e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-2 py-1.5 text-sm"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-xs font-bold text-gray-700">プラン適用開始日 (任意)</label>
        <input
          type="date"
          value={activatedAt}
          onChange={(e) => setActivatedAt(e.target.value)}
          className="mt-1 block w-full border border-gray-300 px-2 py-1.5 text-sm"
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={prepaidFull}
          onChange={(e) => setPrepaidFull(e.target.checked)}
        />
        一括前払い済 (中途解約不可)
      </label>

      <div>
        <label className="block text-xs font-bold text-gray-700">admin メモ (任意、500 字以内)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
          rows={2}
          className="mt-1 block w-full border border-gray-300 px-2 py-1.5 text-sm"
          placeholder="契約書 ID / 営業担当 / 注釈"
        />
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="border border-green-300 bg-green-50 p-2 text-sm text-green-700">
          プランを更新しました
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {pending ? "更新中..." : "プランを更新"}
      </button>
    </form>
  )
}
