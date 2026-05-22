"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, MessageSquareText, Loader2 } from "lucide-react"

interface Template {
  id: string
  name: string
  body: string
}

/**
 * 応募フォームの textarea 横に置いて、保存済みテンプレートを挿入するボタン。
 * 未ログイン / テンプレ無しなら「ログインして作成」リンクのみ。
 */
export function TemplateInserter({
  onInsert,
}: {
  onInsert: (body: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Template[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [unauthorized, setUnauthorized] = useState(false)

  async function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (items !== null || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/users/me/message-templates")
      if (res.status === 401) {
        setUnauthorized(true)
        return
      }
      if (!res.ok) return
      const data = (await res.json()) as { items: Template[] }
      setItems(data.items)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={toggle}
        className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800"
      >
        <MessageSquareText className="h-3.5 w-3.5" />
        テンプレ挿入
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-80 max-h-80 overflow-auto border bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 p-4 text-xs text-gray-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              読み込み中...
            </div>
          ) : unauthorized ? (
            <div className="p-3 text-xs text-gray-600 space-y-2">
              <p>定型文を保存するにはログインが必要です。</p>
              <Link
                href="/login?callbackUrl=/mypage/message-templates"
                className="inline-block text-primary-700 hover:underline font-bold"
              >
                ログイン →
              </Link>
            </div>
          ) : !items || items.length === 0 ? (
            <div className="p-3 text-xs text-gray-600 space-y-2">
              <p>まだテンプレートがありません。</p>
              <Link
                href="/mypage/message-templates"
                target="_blank"
                className="inline-block text-primary-700 hover:underline font-bold"
              >
                マイページで作成 →
              </Link>
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onInsert(t.body)
                      setOpen(false)
                    }}
                    className="block w-full text-left px-3 py-2 hover:bg-primary-50"
                  >
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                      {t.body}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
