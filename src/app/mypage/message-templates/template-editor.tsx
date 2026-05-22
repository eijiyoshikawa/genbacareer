"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Save, Trash2, Loader2 } from "lucide-react"

interface Item {
  id: string
  name: string
  body: string
  sortOrder: number
}

export function TemplateEditor({ initialItems }: { initialItems: Item[] }) {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>(initialItems)
  const [error, setError] = useState("")
  const [newOpen, setNewOpen] = useState(initialItems.length === 0)
  const [draft, setDraft] = useState({ name: "", body: "" })
  const [busy, setBusy] = useState<string | null>(null)

  async function createItem() {
    if (!draft.name.trim() || !draft.body.trim()) {
      setError("テンプレ名と本文は必須です")
      return
    }
    setBusy("new")
    setError("")
    try {
      const res = await fetch("/api/users/me/message-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          body: draft.body.trim(),
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "作成に失敗しました")
        return
      }
      const data = (await res.json()) as { template: Item }
      setItems((arr) => [...arr, data.template])
      setDraft({ name: "", body: "" })
      setNewOpen(false)
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function updateItem(id: string, patch: Partial<Item>) {
    setBusy(id)
    setError("")
    try {
      const res = await fetch(`/api/users/me/message-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "保存に失敗しました")
        return
      }
      router.refresh()
    } finally {
      setBusy(null)
    }
  }

  async function deleteItem(id: string) {
    if (!confirm("このテンプレートを削除しますか？")) return
    setBusy(id)
    try {
      const res = await fetch(`/api/users/me/message-templates/${id}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setItems((arr) => arr.filter((t) => t.id !== id))
        router.refresh()
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {items.map((item) => (
        <ItemRow
          key={item.id}
          item={item}
          busy={busy === item.id}
          onSave={(patch) => updateItem(item.id, patch)}
          onDelete={() => deleteItem(item.id)}
        />
      ))}

      {newOpen ? (
        <div className="border border-dashed border-primary-300 bg-primary-50/40 p-4 space-y-3">
          <p className="text-sm font-bold text-primary-800">新しいテンプレート</p>
          <input
            type="text"
            placeholder="テンプレ名（例: 寮希望）"
            maxLength={60}
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="block w-full border px-3 py-2 text-sm"
          />
          <textarea
            placeholder="本文（例: 寮完備の現場を希望します。平日 18 時以降に連絡可能です。）"
            rows={4}
            maxLength={2000}
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            className="block w-full border px-3 py-2 text-sm"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy === "new"}
              onClick={createItem}
              className="inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 px-3 py-1.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {busy === "new" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              保存
            </button>
            <button
              type="button"
              onClick={() => {
                setNewOpen(false)
                setDraft({ name: "", body: "" })
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          </div>
        </div>
      ) : items.length < 10 ? (
        <button
          type="button"
          onClick={() => setNewOpen(true)}
          className="inline-flex items-center gap-1.5 border border-dashed border-primary-300 bg-white hover:bg-primary-50 px-4 py-2.5 text-sm font-bold text-primary-700"
        >
          <Plus className="h-4 w-4" />
          テンプレートを追加（{10 - items.length} 件まで）
        </button>
      ) : (
        <p className="text-xs text-gray-500">
          テンプレートは 10 件までです。不要なものを削除すると追加できます。
        </p>
      )}
    </div>
  )
}

function ItemRow({
  item,
  busy,
  onSave,
  onDelete,
}: {
  item: Item
  busy: boolean
  onSave: (patch: Partial<Item>) => void
  onDelete: () => void
}) {
  const [name, setName] = useState(item.name)
  const [body, setBody] = useState(item.body)
  const dirty = name !== item.name || body !== item.body

  return (
    <div className="border bg-white p-4 shadow-sm space-y-2">
      <input
        type="text"
        maxLength={60}
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="block w-full font-bold text-sm border px-3 py-1.5"
      />
      <textarea
        rows={3}
        maxLength={2000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className="block w-full text-sm border px-3 py-2"
      />
      <div className="flex items-center gap-3 text-xs">
        <button
          type="button"
          disabled={!dirty || busy}
          onClick={() => onSave({ name, body })}
          className="inline-flex items-center gap-1 text-primary-700 hover:underline disabled:text-gray-400 disabled:no-underline"
        >
          {busy ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Save className="h-3 w-3" />
          )}
          保存
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="inline-flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50"
        >
          <Trash2 className="h-3 w-3" />
          削除
        </button>
      </div>
    </div>
  )
}
