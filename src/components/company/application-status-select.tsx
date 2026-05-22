"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const STATUS_OPTIONS = [
  { value: "applied", label: "応募済み" },
  { value: "reviewing", label: "選考中" },
  { value: "interview", label: "面接" },
  { value: "offered", label: "内定" },
  { value: "hired", label: "採用" },
  { value: "rejected", label: "不採用" },
]

export function ApplicationStatusSelect({
  applicationId,
  currentStatus,
}: {
  applicationId: string
  currentStatus: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value
    if (newStatus === currentStatus) return

    setLoading(true)
    try {
      const res = await fetch(`/api/company/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error ?? "ステータスの更新に失敗しました")
        return
      }

      router.refresh()
    } catch {
      alert("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <select
      value={currentStatus}
      onChange={handleChange}
      disabled={loading}
      className="border px-2 py-1 text-xs font-medium shadow-sm disabled:opacity-50"
    >
      {STATUS_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}
