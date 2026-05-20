"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"

interface BlockedCompany {
  id: string
  name: string
  logoUrl: string | null
  prefecture: string | null
}

interface Props {
  initialBlockedCompanies: BlockedCompany[]
  initialBlockedKeywords: string[]
}

export function BlockSettingsForm({
  initialBlockedCompanies,
  initialBlockedKeywords,
}: Props) {
  const router = useRouter()
  const [companies, setCompanies] = useState(initialBlockedCompanies)
  const [keywords, setKeywords] = useState(initialBlockedKeywords)
  const [keywordInput, setKeywordInput] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  function addKeyword() {
    const k = keywordInput.trim()
    if (!k) return
    if (k.length > 50) {
      setError("キーワードは 50 文字以内で入力してください")
      return
    }
    if (keywords.length >= 50) {
      setError("キーワードは最大 50 件までです")
      return
    }
    if (keywords.includes(k)) {
      setKeywordInput("")
      return
    }
    setKeywords([...keywords, k])
    setKeywordInput("")
    setError("")
  }

  function removeKeyword(k: string) {
    setKeywords(keywords.filter((x) => x !== k))
  }

  function removeCompany(id: string) {
    setCompanies(companies.filter((c) => c.id !== id))
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockedCompanyIds: companies.map((c) => c.id),
          blockedKeywords: keywords,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "保存に失敗しました")
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* ブロック企業リスト */}
      <section className="border bg-white p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            ブロック中の企業 ({companies.length} / 200)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            企業を追加するには、各企業ページの「この企業をブロック」ボタンから設定してください。
          </p>
        </div>
        {companies.length === 0 ? (
          <p className="text-sm text-gray-400">ブロック中の企業はありません。</p>
        ) : (
          <ul className="space-y-2">
            {companies.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 border border-gray-200 p-2"
              >
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logoUrl}
                    alt=""
                    className="h-8 w-8 shrink-0 border object-contain bg-white"
                  />
                ) : (
                  <div className="h-8 w-8 shrink-0 border bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-900">
                    {c.name}
                  </p>
                  {c.prefecture && (
                    <p className="text-xs text-gray-500">{c.prefecture}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeCompany(c.id)}
                  aria-label={`${c.name} のブロックを解除`}
                  className="text-gray-400 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* NG キーワード */}
      <section className="border bg-white p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            NG キーワード ({keywords.length} / 50)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            求人タイトル・説明文に含まれていると検索結果から除外されます。
            社名や事業所名を入れておくと現職バレ防止に有効です。
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addKeyword()
              }
            }}
            maxLength={50}
            placeholder="例: 株式会社○○、ABC 工務店"
            className="flex-1 border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addKeyword}
            className="bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            追加
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700"
              >
                {k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  aria-label={`${k} を削除`}
                  className="hover:text-red-900"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {error && (
        <div className="bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 p-3 text-sm text-green-700">
          ブロック設定を保存しました
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-500 px-6 py-2 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  )
}
