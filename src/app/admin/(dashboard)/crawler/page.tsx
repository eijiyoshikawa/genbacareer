"use client"

import { useState } from "react"
import { Bot, Play, Loader2 } from "lucide-react"

const PREFECTURES = [
  { code: "13", name: "東京都" },
  { code: "27", name: "大阪府" },
  { code: "14", name: "神奈川県" },
  { code: "23", name: "愛知県" },
  { code: "40", name: "福岡県" },
  { code: "01", name: "北海道" },
  { code: "04", name: "宮城県" },
  { code: "11", name: "埼玉県" },
  { code: "12", name: "千葉県" },
  { code: "26", name: "京都府" },
  { code: "28", name: "兵庫県" },
  { code: "34", name: "広島県" },
]

const CATEGORIES = [
  { value: "construction", label: "建築・躯体" },
  { value: "civil", label: "土木" },
  { value: "electrical", label: "電気・設備" },
  { value: "interior", label: "内装・仕上げ" },
  { value: "demolition", label: "解体・産廃" },
  { value: "driver", label: "ドライバー・重機" },
  { value: "management", label: "施工管理" },
  { value: "survey", label: "測量・設計" },
  { value: "", label: "全職種" },
]

interface ImportResult {
  success: boolean
  stats?: {
    created: number
    updated: number
    closed: number
    skipped?: number
    errors: number
    totalProcessed: number
    durationMs: number
  }
  error?: string
}

export default function AdminCrawlerPage() {
  const [prefecture, setPrefecture] = useState("13")
  const [category, setCategory] = useState("driver")
  const [maxPages, setMaxPages] = useState("3")
  const [dryRun, setDryRun] = useState(true)
  const [closeOrphans, setCloseOrphans] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  async function handleRun() {
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/admin/hellowork/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prefecture,
          category: category || undefined,
          maxPages: Number(maxPages),
          dryRun,
          closeOrphans,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setResult({ success: false, error: data.error ?? "エラーが発生しました" })
      } else {
        setResult({ success: true, stats: data.stats })
      }
    } catch {
      setResult({ success: false, error: "通信エラーが発生しました" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">クローラー管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        ハローワークインターネットサービスからの求人取り込み
      </p>

      <div className="mt-6 border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary-100">
            <Bot className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              手動インポート実行
            </h2>
            <p className="text-sm text-gray-500">
              指定条件でハローワーク求人を取得・インポートします
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              都道府県
            </label>
            <select
              value={prefecture}
              onChange={(e) => setPrefecture(e.target.value)}
              className="mt-1 block w-full border px-3 py-2 text-sm"
            >
              {PREFECTURES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              職種カテゴリ
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 block w-full border px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              最大取得ページ数
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={maxPages}
              onChange={(e) => setMaxPages(e.target.value)}
              className="mt-1 block w-full border px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dryRun}
                onChange={(e) => setDryRun(e.target.checked)}
                className="h-4 w-4 border-gray-300 text-primary-600"
              />
              <span className="text-sm text-gray-700">
                ドライラン（DB変更なし）
              </span>
            </label>
          </div>

          <div className="sm:col-span-2 border border-amber-300 bg-amber-50 p-3">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={closeOrphans}
                onChange={(e) => setCloseOrphans(e.target.checked)}
                className="mt-0.5 h-4 w-4 border-amber-400 text-amber-600"
              />
              <span className="text-sm text-amber-900">
                <strong>closeOrphans を有効にする（破壊的・通常 OFF）</strong>
                <span className="mt-1 block text-xs text-amber-800">
                  ON にすると、この 1 回のバッチに含まれない HW 求人すべてが
                  <code className="mx-1 bg-amber-100 px-1">
                    status=closed
                  </code>
                  に書き換わります。週次 fullSweep など全件取得時のみ使用してください。
                </span>
              </span>
            </label>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={handleRun}
            disabled={loading}
            className="inline-flex items-center gap-2 bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4" />
            )}
            {loading ? "実行中..." : "インポート実行"}
          </button>
        </div>

        {/* Result */}
        {result && (
          <div
            className={`mt-6  p-4 ${
              result.success ? "bg-green-50" : "bg-red-50"
            }`}
          >
            {result.success && result.stats ? (
              <div>
                <p className="font-medium text-green-800">
                  インポート完了
                </p>
                <dl className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
                  <div>
                    <dt className="text-green-600">新規追加</dt>
                    <dd className="text-lg font-bold text-green-800">
                      {result.stats.created} 件
                    </dd>
                  </div>
                  <div>
                    <dt className="text-primary-600">更新</dt>
                    <dd className="text-lg font-bold text-primary-800">
                      {result.stats.updated} 件
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">終了 (closed)</dt>
                    <dd className="text-lg font-bold text-gray-800">
                      {result.stats.closed} 件
                    </dd>
                  </div>
                  <div>
                    <dt className="text-amber-600">スキップ (非建設業)</dt>
                    <dd className="text-lg font-bold text-amber-800">
                      {result.stats.skipped ?? 0} 件
                    </dd>
                  </div>
                  <div>
                    <dt className="text-red-600">エラー</dt>
                    <dd className="text-lg font-bold text-red-800">
                      {result.stats.errors} 件
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">処理件数</dt>
                    <dd className="text-lg font-bold text-gray-800">
                      {result.stats.totalProcessed} 件
                    </dd>
                  </div>
                  <div>
                    <dt className="text-gray-600">処理時間</dt>
                    <dd className="text-lg font-bold text-gray-800">
                      {(result.stats.durationMs / 1000).toFixed(1)} 秒
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <p className="text-sm text-red-600">{result.error}</p>
            )}
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-6 border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">注意事項</h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-600">
          <li>
            ・robots.txt を確認し、許可されたパスのみクロールします
          </li>
          <li>
            ・リクエスト間隔は1秒以上を確保します（サーバー負荷軽減）
          </li>
          <li>
            ・出典「ハローワークインターネットサービス」を明記します
          </li>
          <li>
            ・掲載終了した求人は自動的に closed に変更されます
          </li>
          <li>
            ・ドライランモードではデータベースへの変更は行われません
          </li>
        </ul>
      </div>
    </div>
  )
}
