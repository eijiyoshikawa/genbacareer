"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Bell,
  BellOff,
  Trash2,
  Loader2,
  ExternalLink,
  Pencil,
  X,
} from "lucide-react"

export function SavedSearchRow({
  id,
  name,
  alertEnabled: initialAlert,
  label,
  href,
  createdAt,
  tags: initialTags,
  excludeKeywords: initialExclude,
}: {
  id: string
  name: string
  alertEnabled: boolean
  label: string
  href: string
  createdAt: string
  tags: string[]
  excludeKeywords: string[]
}) {
  const router = useRouter()
  const [alert, setAlert] = useState(initialAlert)
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<"toggle" | "delete" | "save" | null>(null)
  const [editing, setEditing] = useState(false)
  const [tags, setTags] = useState(initialTags.join(", "))
  const [excludeKeywords, setExcludeKeywords] = useState(initialExclude.join(", "))

  async function toggleAlert() {
    setBusy("toggle")
    try {
      const res = await fetch(`/api/users/me/saved-searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertEnabled: !alert }),
      })
      if (res.ok) {
        setAlert(!alert)
      }
    } catch {
      // noop
    } finally {
      setBusy(null)
    }
  }

  async function remove() {
    if (!confirm(`「${name}」を削除しますか？`)) return
    setBusy("delete")
    try {
      const res = await fetch(`/api/users/me/saved-searches/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        startTransition(() => router.refresh())
      }
    } finally {
      setBusy(null)
    }
  }

  function splitCsv(input: string): string[] {
    return input
      .split(/[,、，\n]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 20)
  }

  async function save() {
    setBusy("save")
    try {
      const res = await fetch(`/api/users/me/saved-searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tags: splitCsv(tags),
          excludeKeywords: splitCsv(excludeKeywords),
        }),
      })
      if (res.ok) {
        setEditing(false)
        startTransition(() => router.refresh())
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-3">
        <Link href={href} className="group min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 group-hover:text-primary-700 flex items-center gap-1">
            {name}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition" />
          </p>
          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{label}</p>
          <p className="mt-0.5 text-xs text-gray-400">
            保存日: {new Date(createdAt).toLocaleDateString("ja-JP")}
          </p>
        </Link>

        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          disabled={busy !== null || pending}
          className="press inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 disabled:opacity-60"
          aria-label={editing ? "編集を閉じる" : "詳細を編集"}
        >
          {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={toggleAlert}
          disabled={busy !== null || pending}
          className={`press inline-flex items-center gap-1 px-2 py-1 text-xs font-bold border ${
            alert
              ? "border-primary-200 bg-primary-50 text-primary-700"
              : "border-gray-300 bg-white text-gray-500"
          } disabled:opacity-60`}
          aria-pressed={alert}
        >
          {busy === "toggle" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : alert ? (
            <Bell className="h-3 w-3" />
          ) : (
            <BellOff className="h-3 w-3" />
          )}
          {alert ? "通知 ON" : "通知 OFF"}
        </button>

        <button
          type="button"
          onClick={remove}
          disabled={busy !== null || pending}
          className="press inline-flex items-center justify-center p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-60"
          aria-label="削除"
        >
          {busy === "delete" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </button>
      </div>

      {editing && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div>
            <label className="block text-xs font-bold text-gray-700">
              カスタムタグ
              <span className="ml-1 font-normal text-gray-400">
                （求人タグといずれか一致でヒット, カンマ区切り, 最大 20 件）
              </span>
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="例: 寮あり, 日払い, 未経験OK"
              className="mt-1 block w-full border px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              maxLength={500}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700">
              除外キーワード
              <span className="ml-1 font-normal text-gray-400">
                （題名/詳細に含むものを除外, カンマ区切り, 最大 20 件）
              </span>
            </label>
            <input
              type="text"
              value={excludeKeywords}
              onChange={(e) => setExcludeKeywords(e.target.value)}
              placeholder="例: 派遣, 短期, 営業"
              className="mt-1 block w-full border px-2 py-1.5 text-sm focus:border-primary-500 focus:outline-none"
              maxLength={500}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={busy !== null || pending}
              className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {busy === "save" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : null}
              保存
            </button>
          </div>
        </div>
      )}
    </li>
  )
}
