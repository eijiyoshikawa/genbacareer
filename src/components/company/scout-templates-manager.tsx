"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Plus } from "lucide-react"

type Template = {
  id: string
  name: string
  body: string
  updatedAt: string
}

/**
 * スカウトテンプレートの作成・編集・削除 UI。
 * Server Component から初期データを受け取り、以降は API 経由で差分更新。
 */
export function ScoutTemplatesManager({
  initialTemplates,
}: {
  initialTemplates: Template[]
}) {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>(initialTemplates)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate(name: string, body: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/company/scout-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setTemplates((prev) => [...prev, data.template])
      setShowNew(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleUpdate(id: string, name: string, body: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/company/scout-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, body }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      const data = await res.json()
      setTemplates((prev) => prev.map((t) => (t.id === id ? data.template : t)))
      setEditingId(null)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("このテンプレートを削除しますか？")) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/company/scout-templates/${id}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setTemplates((prev) => prev.filter((t) => t.id !== id))
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {!showNew && (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="press inline-flex items-center gap-1.5 border border-primary-600 bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          新しいテンプレート
        </button>
      )}

      {showNew && (
        <TemplateForm
          onSave={handleCreate}
          onCancel={() => setShowNew(false)}
          busy={busy}
        />
      )}

      <div className="grid gap-3">
        {templates.length === 0 ? (
          <p className="border bg-white p-6 text-center text-sm text-gray-500">
            まだテンプレートがありません。よく使う文章を保存しておくと、スカウト送信時に素早く挿入できます。
          </p>
        ) : (
          templates.map((t) =>
            editingId === t.id ? (
              <TemplateForm
                key={t.id}
                initialName={t.name}
                initialBody={t.body}
                onSave={(name, body) => handleUpdate(t.id, name, body)}
                onCancel={() => setEditingId(null)}
                busy={busy}
              />
            ) : (
              <article key={t.id} className="border bg-white p-4">
                <header className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-gray-900">{t.name}</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(t.id)}
                      className="press inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      編集
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(t.id)}
                      disabled={busy}
                      className="press inline-flex items-center gap-1 px-2 py-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      削除
                    </button>
                  </div>
                </header>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-gray-700 line-clamp-6">
                  {t.body}
                </pre>
                <p className="mt-2 text-xs text-gray-400">
                  最終更新: {new Date(t.updatedAt).toLocaleDateString("ja-JP")}
                </p>
              </article>
            )
          )
        )}
      </div>
    </div>
  )
}

function TemplateForm({
  initialName = "",
  initialBody = "",
  onSave,
  onCancel,
  busy,
}: {
  initialName?: string
  initialBody?: string
  onSave: (name: string, body: string) => void
  onCancel: () => void
  busy: boolean
}) {
  const [name, setName] = useState(initialName)
  const [body, setBody] = useState(initialBody)

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (name.trim().length === 0 || body.trim().length === 0) return
    onSave(name.trim(), body.trim())
  }

  return (
    <form onSubmit={submit} className="border bg-white p-4 space-y-3">
      <label className="block">
        <span className="block text-sm font-medium text-gray-700">名前 (社内用)</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          className="mt-1 block w-full border px-3 py-2 text-sm"
          placeholder="例: 未経験者向け / 即戦力向け"
        />
      </label>
      <label className="block">
        <span className="block text-sm font-medium text-gray-700">文章</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          maxLength={5000}
          rows={8}
          className="mt-1 block w-full border px-3 py-2 text-sm leading-relaxed"
          placeholder={`例:\n\n{応募者の名前} 様\n\nはじめまして、ゲンバキャリアでお見かけしてご連絡しました...`}
        />
        <span className="text-xs text-gray-400">{body.length} / 5000 文字</span>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={busy}
          className="press inline-flex items-center bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {busy ? "保存中..." : "保存"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="press inline-flex items-center border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
