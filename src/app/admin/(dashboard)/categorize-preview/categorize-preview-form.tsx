"use client"

import { useMemo, useState } from "react"
import { guessCategory } from "@/lib/category-guess"
import { getCategoryLabel } from "@/lib/categories"

export function CategorizePreviewForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const result = useMemo(() => {
    if (!title.trim()) return null
    return guessCategory({ title, description })
  }, [title, description])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            求人タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: 大阪市内 / 鳶職人募集 / 月給 30 万〜"
            className="block w-full border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            求人説明文
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={10}
            placeholder="鉄骨の組立て、足場の設置 / 玉掛け資格保有者歓迎..."
            className="block w-full border border-gray-300 px-3 py-2 text-sm shadow-sm"
          />
        </div>

        <p className="text-xs text-gray-500">
          ※ 入力に応じて右側の判定結果がリアルタイムに更新されます。サーバーには送信されません。
        </p>
      </div>

      <div className="space-y-4">
        {result ? (
          <>
            <div className="border bg-white p-5 shadow-sm">
              <p className="text-xs text-gray-500">採用カテゴリ</p>
              <p className="mt-1 text-2xl font-extrabold text-primary-600">
                {getCategoryLabel(result.category)}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                信頼度: {Math.round(result.confidence * 100)}%
              </p>
            </div>

            <div className="border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-700 mb-3">
                カテゴリ別スコア
              </p>
              <ul className="space-y-1.5">
                {Object.entries(result.scores)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, score]) => {
                    const max = Math.max(
                      ...Object.values(result.scores),
                      1
                    )
                    const pct = (score / max) * 100
                    return (
                      <li key={cat} className="text-xs">
                        <div className="flex items-center justify-between">
                          <span
                            className={
                              cat === result.category
                                ? "font-bold text-primary-700"
                                : "text-gray-600"
                            }
                          >
                            {getCategoryLabel(cat)}
                          </span>
                          <span className="tabular-nums text-gray-500">
                            {score}
                          </span>
                        </div>
                        <div className="mt-0.5 h-1 w-full bg-gray-100">
                          <div
                            className={`h-full ${
                              cat === result.category
                                ? "bg-primary-500"
                                : "bg-gray-300"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    )
                  })}
              </ul>
            </div>

            <div className="border bg-white p-5 shadow-sm">
              <p className="text-xs font-bold text-gray-700 mb-2">
                マッチしたキーワード ({result.matchedKeywords.length})
              </p>
              {result.matchedKeywords.length === 0 ? (
                <p className="text-xs text-gray-400">
                  該当するキーワードがありません
                </p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {result.matchedKeywords.map((k, i) => (
                    <span
                      key={`${k}-${i}`}
                      className="border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-700"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="border-2 border-dashed border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-400">
            タイトルを入力すると判定結果が表示されます
          </div>
        )}
      </div>
    </div>
  )
}
