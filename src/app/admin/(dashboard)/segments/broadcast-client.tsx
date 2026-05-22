"use client"

import { useEffect, useState } from "react"
import { Loader2, Search, Send, X, Plus, Check, AlertCircle, Users } from "lucide-react"

const CATEGORIES = [
  { value: "construction", label: "建築・躯体" },
  { value: "civil", label: "土木" },
  { value: "electrical", label: "電気・設備" },
  { value: "interior", label: "内装・仕上げ" },
  { value: "demolition", label: "解体・産廃" },
  { value: "driver", label: "ドライバー" },
  { value: "management", label: "施工管理" },
  { value: "survey", label: "測量・設計" },
]

const PREFECTURES = [
  "東京都", "神奈川県", "千葉県", "埼玉県", "大阪府", "兵庫県",
  "京都府", "愛知県", "福岡県", "北海道", "宮城県", "広島県",
]

export interface StatusOption {
  value: string
  label: string
}

export function SegmentBroadcastClient({
  utmSourceOptions,
  statusOptions,
}: {
  utmSourceOptions: string[]
  statusOptions: StatusOption[]
}) {
  const [segment, setSegment] = useState<Record<string, string>>({})
  const [preview, setPreview] = useState<{ total: number; bound: number } | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedJobs, setSelectedJobs] = useState<Array<{ id: string; title: string; prefecture: string }>>([])
  const [showJobPicker, setShowJobPicker] = useState(false)
  const [freeText, setFreeText] = useState("")
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<null | { ok: true; success: number; skipped: number; failure: number } | string>(null)

  // 条件変更時に preview を再取得（debounce 400ms）
  useEffect(() => {
    const t = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const sp = new URLSearchParams(segment)
        const res = await fetch(`/api/admin/segments/preview?${sp.toString()}`)
        const j = await res.json().catch(() => null)
        if (j && typeof j.total === "number") setPreview({ total: j.total, bound: j.bound })
      } finally {
        setPreviewLoading(false)
      }
    }, 400)
    return () => clearTimeout(t)
  }, [segment])

  function setField(k: string, v: string) {
    setSegment((prev) => {
      const next = { ...prev }
      if (v === "") delete next[k]
      else next[k] = v
      return next
    })
    setResult(null)
  }

  async function broadcast() {
    setSending(true)
    setResult(null)
    try {
      const body = {
        segment: Object.fromEntries(
          Object.entries(segment).map(([k, v]) => {
            if (k === "lineBound") return [k, v === "true"]
            if (k === "createdSinceDays") return [k, Number(v)]
            return [k, v]
          })
        ),
        jobIds: selectedJobs.map((j) => j.id),
        freeText: freeText.trim() || undefined,
      }
      const res = await fetch("/api/admin/segments/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setResult(j?.message ?? j?.error ?? `配信失敗 (${res.status})`)
      } else {
        setResult({
          ok: true,
          success: j.successCount ?? 0,
          skipped: j.skippedCount ?? 0,
          failure: j.failureCount ?? 0,
        })
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "通信エラー")
    } finally {
      setSending(false)
    }
  }

  const canBroadcast = selectedJobs.length > 0 && (preview?.bound ?? 0) > 0 && !sending

  return (
    <section className="border bg-white p-5 space-y-4">
      {/* 条件構築 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="lead ステータス">
          <select
            value={segment.status ?? ""}
            onChange={(e) => setField("status", e.target.value)}
            className={selectClass}
          >
            <option value="">指定なし</option>
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="UTM source">
          <select
            value={segment.utmSource ?? ""}
            onChange={(e) => setField("utmSource", e.target.value)}
            className={selectClass}
          >
            <option value="">指定なし</option>
            {utmSourceOptions.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </Field>

        <Field label="LINE 友だち追加">
          <select
            value={segment.lineBound ?? ""}
            onChange={(e) => setField("lineBound", e.target.value)}
            className={selectClass}
          >
            <option value="">指定なし（送信時に bound=true で自動絞り）</option>
            <option value="true">追加済のみ</option>
            <option value="false">未追加のみ（参考用）</option>
          </select>
        </Field>

        <Field label="応募求人のカテゴリ">
          <select
            value={segment.jobCategory ?? ""}
            onChange={(e) => setField("jobCategory", e.target.value)}
            className={selectClass}
          >
            <option value="">指定なし</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="応募求人の県">
          <select
            value={segment.jobPrefecture ?? ""}
            onChange={(e) => setField("jobPrefecture", e.target.value)}
            className={selectClass}
          >
            <option value="">指定なし</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="閲覧履歴 カテゴリ">
          <select
            value={segment.viewedCategory ?? ""}
            onChange={(e) => setField("viewedCategory", e.target.value)}
            className={selectClass}
          >
            <option value="">指定なし</option>
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </Field>

        <Field label="閲覧履歴 県">
          <select
            value={segment.viewedPrefecture ?? ""}
            onChange={(e) => setField("viewedPrefecture", e.target.value)}
            className={selectClass}
          >
            <option value="">指定なし</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </Field>

        <Field label="作成期間（日）">
          <select
            value={segment.createdSinceDays ?? ""}
            onChange={(e) => setField("createdSinceDays", e.target.value)}
            className={selectClass}
          >
            <option value="">全期間</option>
            <option value="7">直近 7 日</option>
            <option value="30">直近 30 日</option>
            <option value="90">直近 90 日</option>
          </select>
        </Field>
      </div>

      {/* マッチ件数 */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Users className="h-4 w-4 text-primary-500" />
          マッチ件数:{" "}
          <span className="font-bold tabular-nums text-lg text-gray-900">
            {previewLoading ? "…" : preview?.total ?? 0}
          </span>{" "}
          / 内 LINE 友だち追加済:{" "}
          <span className="font-bold tabular-nums text-lg text-primary-700">
            {previewLoading ? "…" : preview?.bound ?? 0}
          </span>
          {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
        </div>
      </div>

      {/* 求人選択 */}
      <div className="border-t border-gray-200 pt-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold text-gray-700">配信する求人 ({selectedJobs.length} / 5)</p>
          <button
            type="button"
            onClick={() => setShowJobPicker(true)}
            disabled={selectedJobs.length >= 5}
            className="press inline-flex items-center gap-1.5 border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100 disabled:opacity-50"
          >
            <Plus className="h-3.5 w-3.5" />
            求人を追加
          </button>
        </div>
        {selectedJobs.length === 0 ? (
          <p className="text-xs text-gray-400 border border-dashed p-3">求人を 1〜5 件選んでください。</p>
        ) : (
          <ul className="space-y-1">
            {selectedJobs.map((j) => (
              <li key={j.id} className="flex items-center gap-2 border bg-warm-50 p-2 text-xs">
                <span className="flex-1 line-clamp-1">{j.title}</span>
                <span className="text-gray-500">{j.prefecture}</span>
                <button
                  type="button"
                  onClick={() => setSelectedJobs((s) => s.filter((x) => x.id !== j.id))}
                  className="press text-red-600 hover:text-red-700"
                  aria-label="削除"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 追記文 */}
      <div className="border-t border-gray-200 pt-3">
        <label className="block text-xs font-bold text-gray-700">追記メッセージ（任意）</label>
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="例: 春の新着求人をまとめてご案内します。"
          className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      {/* フィードバック */}
      {result && typeof result === "object" && "ok" in result && result.ok && (
        <div className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <Check className="inline h-4 w-4 mr-1" />
          配信完了: 成功 {result.success} 件 / スキップ {result.skipped} 件 / 失敗 {result.failure} 件
        </div>
      )}
      {typeof result === "string" && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="inline h-4 w-4 mr-1" />
          {result}
        </div>
      )}

      {/* 送信ボタン */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-3">
        <p className="text-xs text-gray-500">
          実際に送信されるのは LINE 友だち追加済の <strong>{preview?.bound ?? 0}</strong> 件のみです。
        </p>
        <button
          type="button"
          onClick={broadcast}
          disabled={!canBroadcast}
          className="press inline-flex items-center gap-2 bg-[#06C755] hover:bg-[#05A847] disabled:bg-gray-300 disabled:cursor-not-allowed px-6 py-2.5 text-sm font-extrabold text-white"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {preview?.bound ?? 0} 件に配信
        </button>
      </div>

      {/* 求人ピッカー モーダル */}
      {showJobPicker && (
        <JobPickerModal
          excludeIds={selectedJobs.map((j) => j.id)}
          slotsLeft={5 - selectedJobs.length}
          onClose={() => setShowJobPicker(false)}
          onPick={(jobs) => {
            setSelectedJobs((s) => [...s, ...jobs].slice(0, 5))
            setShowJobPicker(false)
          }}
        />
      )}
    </section>
  )
}

const selectClass =
  "w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function JobPickerModal({
  excludeIds,
  slotsLeft,
  onClose,
  onPick,
}: {
  excludeIds: string[]
  slotsLeft: number
  onClose: () => void
  onPick: (jobs: Array<{ id: string; title: string; prefecture: string }>) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ id: string; title: string; prefecture: string }>>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  async function search(q: string) {
    if (!q.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs?q=${encodeURIComponent(q)}&limit=15`)
      const j = await res.json().catch(() => ({}))
      const filtered: Array<{ id: string; title: string; prefecture: string }> = (j?.jobs ?? []).filter(
        (r: { id: string }) => !excludeIds.includes(r.id)
      )
      setResults(filtered)
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < slotsLeft) next.add(id)
      return next
    })
  }

  function confirm() {
    const picked = results.filter((r) => selected.has(r.id))
    onPick(picked)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b p-4">
          <h3 className="text-base font-bold text-gray-900">求人を追加</h3>
          <button type="button" onClick={onClose} className="press p-1 text-gray-500 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              search(query)
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="キーワードで検索"
              className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <button type="submit" className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-bold text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              検索
            </button>
          </form>
          <ul className="space-y-1 max-h-[50vh] overflow-y-auto">
            {results.map((r) => {
              const isSelected = selected.has(r.id)
              const disabled = !isSelected && selected.size >= slotsLeft
              return (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => toggle(r.id)}
                    disabled={disabled}
                    className={`press w-full text-left flex items-start gap-2 border p-2 ${
                      isSelected ? "border-primary-600 bg-primary-50" : "border-gray-200 hover:border-primary-300"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                  >
                    <span className={`mt-0.5 inline-block h-4 w-4 shrink-0 border-2 ${isSelected ? "bg-primary-600 border-primary-600" : "border-gray-400"}`}>
                      {isSelected && <Check className="h-3 w-3 text-white" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold line-clamp-2">{r.title}</p>
                      <p className="text-xs text-gray-500">{r.prefecture}</p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="border-t p-3 flex justify-between items-center">
          <span className="text-xs text-gray-500">{selected.size} / {slotsLeft} 件</span>
          <button
            type="button"
            onClick={confirm}
            disabled={selected.size === 0}
            className="press bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 px-4 py-2 text-sm font-bold text-white"
          >
            {selected.size} 件追加
          </button>
        </div>
      </div>
    </div>
  )
}
