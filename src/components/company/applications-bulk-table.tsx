"use client"

import { CandidateAvatar } from "@/components/company/candidate-avatar"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ApplicationStatusSelect } from "@/components/company/application-status-select"

const STATUS_OPTIONS = [
  { value: "applied", label: "応募済み" },
  { value: "reviewing", label: "選考中" },
  { value: "interview", label: "面接" },
  { value: "offered", label: "内定" },
  { value: "hired", label: "採用" },
  { value: "rejected", label: "不採用" },
] as const

export type ApplicationRow = {
  id: string
  status: string
  message: string | null
  createdAt: string
  job: { id: string; title: string }
  user: {
    name: string | null
    avatarUrl?: string | null
    email: string | null
    phone: string | null
    prefecture: string | null
  }
}

/**
 * 応募者一覧のチェックボックス付きテーブル + 一括ステータス変更 UI。
 */
export function ApplicationsBulkTable({
  applications,
}: {
  applications: ApplicationRow[]
}) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkStatus, setBulkStatus] = useState<string>("reviewing")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const allChecked =
    applications.length > 0 &&
    applications.every((a) => selectedIds.has(a.id))

  function toggleAll() {
    if (allChecked) setSelectedIds(new Set())
    else setSelectedIds(new Set(applications.map((a) => a.id)))
  }
  function toggleOne(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  async function handleBulkApply() {
    if (selectedIds.size === 0) return
    const label =
      STATUS_OPTIONS.find((s) => s.value === bulkStatus)?.label ?? bulkStatus
    if (
      !confirm(
        `選択中の ${selectedIds.size} 件の応募者を「${label}」に変更しますか？`
      )
    )
      return

    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/company/applications/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          status: bulkStatus,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json().catch(() => ({}))
      if (typeof data.skipped === "number" && data.skipped > 0) {
        setError(
          `${data.updated} 件を更新しました（${data.skipped} 件は現在のステータスから「${label}」へ変更できないためスキップされました）`
        )
      }
      setSelectedIds(new Set())
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-4">
      {/* 一括操作バー */}
      {selectedIds.size > 0 && (
        <div className="sticky top-2 z-10 mb-2 flex items-center gap-3 border border-primary-300 bg-primary-50 px-3 py-2 shadow">
          <p className="text-sm font-bold text-primary-900">
            {selectedIds.size} 件選択中
          </p>
          <select
            value={bulkStatus}
            onChange={(e) => setBulkStatus(e.target.value)}
            disabled={busy}
            className="border bg-white px-2 py-1 text-sm"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}に変更
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkApply}
            disabled={busy}
            className="press border border-primary-600 bg-primary-600 px-3 py-1 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {busy ? "処理中..." : "適用"}
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            disabled={busy}
            className="text-xs text-gray-600 hover:underline disabled:opacity-50"
          >
            選択解除
          </button>
          {error && <span className="text-xs text-red-600">{error}</span>}
        </div>
      )}

      <div className="overflow-hidden border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  checked={allChecked}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer"
                  aria-label="全選択"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                応募者
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                連絡先
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                求人
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                ステータス
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                応募日
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(app.id)}
                    onChange={() => toggleOne(app.id)}
                    className="h-4 w-4 cursor-pointer"
                    aria-label={`${app.user.name ?? ""} を選択`}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CandidateAvatar
                      avatarUrl={app.user.avatarUrl ?? null}
                      name={app.user.name}
                      size="sm"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {app.user.name ?? "名前未設定"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {app.user.prefecture ?? ""}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm text-gray-600">{app.user.email}</p>
                  {app.user.phone && (
                    <p className="text-xs text-gray-500">{app.user.phone}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {app.job.title}
                </td>
                <td className="px-4 py-3">
                  <ApplicationStatusSelect
                    applicationId={app.id}
                    currentStatus={app.status}
                  />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                  {new Date(app.createdAt).toLocaleDateString("ja-JP")}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Link
                    href={`/company/applications/${app.id}`}
                    className="text-sm font-bold text-primary-700 hover:underline"
                  >
                    詳細 →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
