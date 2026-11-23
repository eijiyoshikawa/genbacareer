"use client"

/**
 * 体験談（利用者の声）の admin CRUD クライアント。
 * 新規入稿フォーム + 既存一覧（インライン編集 / 公開トグル / 削除）。
 */

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Save, Trash2, Eye, EyeOff } from "lucide-react"

type Item = {
  id: string
  quote: string
  who: string
  published: boolean
  sortOrder: number
  createdAt: string
}

export function TestimonialsManager({
  initialItems,
}: {
  initialItems: Item[]
}) {
  const router = useRouter()
  const [error, setError] = useState("")

  const publishedCount = initialItems.filter((i) => i.published).length

  return (
    <div className="mt-6 space-y-6">
      {error && (
        <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <p className="text-sm text-gray-600">
        登録 {initialItems.length} 件 / 公開中{" "}
        <span className="font-bold text-primary-600">{publishedCount}</span> 件
        {publishedCount > 3 && (
          <span className="ml-2 text-xs text-gray-400">
            （TOP には上位 3 件のみ表示されます）
          </span>
        )}
      </p>

      <CreateForm onError={setError} onDone={() => router.refresh()} />

      {initialItems.length === 0 ? (
        <div className="border bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
          まだ体験談が登録されていません。上のフォームから追加してください。
        </div>
      ) : (
        <ul className="space-y-3">
          {initialItems.map((item) => (
            <EditRow
              key={item.id}
              item={item}
              onError={setError}
              onDone={() => router.refresh()}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

// ============================================================
// 新規入稿フォーム
// ============================================================

function CreateForm({
  onError,
  onDone,
}: {
  onError: (m: string) => void
  onDone: () => void
}) {
  const [quote, setQuote] = useState("")
  const [who, setWho] = useState("")
  const [sortOrder, setSortOrder] = useState(0)
  const [pending, startTransition] = useTransition()

  function submit() {
    onError("")
    if (!quote.trim() || !who.trim()) {
      onError("本文と肩書きは必須です")
      return
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/testimonials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quote: quote.trim(),
            who: who.trim(),
            sortOrder,
            published: true,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          onError(data.error ?? "追加に失敗しました")
          return
        }
        setQuote("")
        setWho("")
        setSortOrder(0)
        onDone()
      } catch {
        onError("通信エラー")
      }
    })
  }

  return (
    <section className="border border-primary-200 bg-primary-50/40 p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
        <Plus className="h-5 w-5 text-primary-600" />
        体験談を新規追加
      </h2>
      <div className="mt-3 space-y-3">
        <div>
          <label className="block text-xs font-bold text-gray-700">
            本文（体験談）
          </label>
          <textarea
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="未経験で入って1年。資格を会社負担で取らせてもらい、給料も上がりました。"
            className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs font-bold text-gray-700">
              肩書き（誰の声か）
            </label>
            <input
              type="text"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              maxLength={120}
              placeholder="20代・鳶工"
              className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="w-28">
            <label className="block text-xs font-bold text-gray-700">
              表示順
            </label>
            <input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              min={0}
              max={9999}
              className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="press inline-flex items-center gap-2 bg-primary-600 px-5 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:bg-gray-400"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          追加する
        </button>
      </div>
    </section>
  )
}

// ============================================================
// 既存行（インライン編集）
// ============================================================

function EditRow({
  item,
  onError,
  onDone,
}: {
  item: Item
  onError: (m: string) => void
  onDone: () => void
}) {
  const [quote, setQuote] = useState(item.quote)
  const [who, setWho] = useState(item.who)
  const [sortOrder, setSortOrder] = useState(item.sortOrder)
  const [pending, startTransition] = useTransition()

  const dirty =
    quote !== item.quote ||
    who !== item.who ||
    sortOrder !== item.sortOrder

  function call(body: object, after?: () => void) {
    onError("")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/testimonials/${item.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          onError(data.error ?? "更新に失敗しました")
          return
        }
        after?.()
        onDone()
      } catch {
        onError("通信エラー")
      }
    })
  }

  function remove() {
    if (!confirm("この体験談を削除しますか？この操作は取り消せません。")) return
    onError("")
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/testimonials/${item.id}`, {
          method: "DELETE",
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          onError(data.error ?? "削除に失敗しました")
          return
        }
        onDone()
      } catch {
        onError("通信エラー")
      }
    })
  }

  return (
    <li
      className={`border bg-white p-4 shadow-sm ${
        item.published ? "border-gray-200" : "border-dashed border-gray-300 opacity-80"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-bold ${
            item.published
              ? "bg-green-100 text-green-700"
              : "bg-gray-100 text-gray-500"
          }`}
        >
          {item.published ? "公開中" : "非公開"}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => call({ published: !item.published })}
            className="press inline-flex items-center gap-1 border border-gray-300 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {item.published ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                非公開にする
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                公開する
              </>
            )}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="press inline-flex items-center gap-1 border border-red-300 px-2.5 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            削除
          </button>
        </div>
      </div>

      <textarea
        value={quote}
        onChange={(e) => setQuote(e.target.value)}
        rows={3}
        maxLength={2000}
        className="mt-3 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-gray-700">肩書き</label>
          <input
            type="text"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            maxLength={120}
            className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <div className="w-24">
          <label className="block text-xs font-bold text-gray-700">表示順</label>
          <input
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
            min={0}
            max={9999}
            className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={() => call({ quote: quote.trim(), who: who.trim(), sortOrder })}
          className="press inline-flex items-center gap-1.5 bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:bg-gray-300"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          保存
        </button>
      </div>
    </li>
  )
}
