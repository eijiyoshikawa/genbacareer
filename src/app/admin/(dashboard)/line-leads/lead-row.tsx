"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Loader2,
  Check,
  AlertCircle,
  ChevronRight,
  Eye,
  MousePointerClick,
  History,
  Send,
  X,
  MessageCircle,
} from "lucide-react"
import { LEAD_STATUSES, LEAD_STATUS_META, type LeadStatus } from "@/lib/line-lead-status"

export interface LeadRowData {
  id: string
  createdAt: string // ISO
  name: string
  phone: string
  email: string
  experienceYears: number | null
  notes: string | null
  status: LeadStatus
  lineUserId: string | null
  lineDisplayName: string | null
  optedOut: boolean
  job: { id: string; title: string; prefecture: string; city: string | null } | null
}

interface HistoryJob {
  id: string
  title: string
  prefecture: string
  city: string | null
  category: string
}
interface ViewedJob {
  id: string
  viewedAt: string
  referer: string | null
  utm: { source: string | null; medium: string | null; campaign: string | null }
  job: HistoryJob
}
interface ClickedJob {
  id: string
  clickedAt: string
  source: string
  job: HistoryJob
}
interface OtherLead {
  id: string
  createdAt: string
  status: string
  name: string
  job: { id: string; title: string } | null
}

export function LeadRow({ lead, expanded: initiallyExpanded }: { lead: LeadRowData; expanded?: boolean }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(initiallyExpanded ?? false)
  const [status, setStatus] = useState<LeadStatus>(lead.status)
  const [notes, setNotes] = useState(lead.notes ?? "")
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<null | "ok" | string>(null)
  const [tab, setTab] = useState<"detail" | "history">("detail")
  const [pushOpen, setPushOpen] = useState(false)

  async function save(changes: { status?: LeadStatus; notes?: string; optedOut?: boolean }) {
    setSaving(true)
    setResult(null)
    try {
      const res = await fetch(`/api/admin/line-leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changes),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setResult(j?.error ?? `保存失敗 (${res.status})`)
      } else {
        setResult("ok")
        router.refresh()
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : "通信エラー")
    } finally {
      setSaving(false)
    }
  }

  const meta = LEAD_STATUS_META[status]
  const createdLocal = new Date(lead.createdAt).toLocaleString("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className="border border-gray-200 bg-white">
      {/* 行ヘッダ（クリックで展開） */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="press w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50"
      >
        <span className={`inline-block px-2 py-0.5 text-xs font-bold border ${meta.classes}`}>
          {meta.label}
        </span>
        {lead.optedOut && (
          <span className="inline-block px-2 py-0.5 text-xs font-bold border bg-gray-200 text-gray-700 border-gray-300">
            配信停止
          </span>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">
            {lead.name}
            <span className="ml-2 text-xs font-normal text-gray-500">
              {createdLocal}
            </span>
          </p>
          <p className="text-xs text-gray-500 truncate">
            {lead.phone} / {lead.email}
            {lead.job && (
              <>
                {" · "}
                <span className="text-primary-700">{lead.job.title}</span>
              </>
            )}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`}
        />
      </button>

      {/* 詳細パネル */}
      {expanded && (
        <div className="border-t border-gray-100 bg-warm-50 p-4 space-y-4">
          {/* タブ */}
          <div className="flex gap-1 border-b border-gray-200 -mx-4 -mt-4 px-4 pt-3 bg-white">
            <TabButton active={tab === "detail"} onClick={() => setTab("detail")}>
              基本情報
            </TabButton>
            <TabButton active={tab === "history"} onClick={() => setTab("history")}>
              <History className="inline h-3.5 w-3.5 mr-1" />
              閲覧履歴
            </TabButton>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => save({ optedOut: !lead.optedOut })}
              disabled={saving}
              title={lead.optedOut ? "配信再開（一括 push の対象に戻す）" : "配信停止（一括 push から除外）"}
              className={`press inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold border ${
                lead.optedOut
                  ? "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                  : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
              }`}
            >
              {lead.optedOut ? "配信再開" : "配信停止"}
            </button>
            <button
              type="button"
              onClick={() => setPushOpen(true)}
              disabled={!lead.lineUserId || lead.optedOut}
              title={
                lead.optedOut
                  ? "配信停止中の lead には送信できません"
                  : lead.lineUserId
                    ? "LINE Push 送信"
                    : "LINE と未紐付け（lineUserId が無い）"
              }
              className="press inline-flex items-center gap-1 bg-[#06C755] hover:bg-[#05A847] disabled:bg-gray-300 disabled:cursor-not-allowed px-3 py-1.5 text-xs font-bold text-white"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              LINE Push
            </button>
          </div>

          {tab === "history" ? (
            <HistoryPanel leadId={lead.id} />
          ) : (
          <>
          {/* メタ情報 */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 text-xs">
            <DefLabel label="氏名" value={lead.name} />
            <DefLabel label="電話" value={lead.phone} link={`tel:${lead.phone}`} />
            <DefLabel label="メール" value={lead.email} link={`mailto:${lead.email}`} />
            <DefLabel
              label="経験年数"
              value={lead.experienceYears !== null ? `${lead.experienceYears} 年` : "未入力"}
            />
            <DefLabel label="LINE 表示名" value={lead.lineDisplayName ?? "未紐付け"} />
            <DefLabel label="作成日時" value={new Date(lead.createdAt).toLocaleString("ja-JP")} />
          </dl>

          {/* 応募先求人 */}
          {lead.job && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1">応募先求人</p>
              <Link
                href={`/jobs/${lead.job.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-1.5 border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700 hover:bg-primary-100"
              >
                {lead.job.title}
                <span className="text-xs font-normal text-primary-600">
                  ({lead.job.prefecture}
                  {lead.job.city ? ` ${lead.job.city}` : ""})
                </span>
              </Link>
            </div>
          )}

          {/* ステータス変更 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-700">ステータス</label>
              <select
                value={status}
                onChange={(e) => {
                  const next = e.target.value as LeadStatus
                  setStatus(next)
                  save({ status: next })
                }}
                disabled={saving}
                className="mt-1 w-full border border-gray-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {LEAD_STATUS_META[s].label} — {LEAD_STATUS_META[s].description}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              {result === "ok" && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <Check className="h-3.5 w-3.5" />
                  保存しました
                </span>
              )}
              {typeof result === "string" && result !== "ok" && (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {result}
                </span>
              )}
              {saving && (
                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  保存中…
                </span>
              )}
            </div>
          </div>

          {/* メモ */}
          <div>
            <label className="block text-xs font-bold text-gray-700">運用メモ</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (lead.notes ?? "")) {
                  save({ notes: notes || undefined })
                }
              }}
              rows={3}
              placeholder="折り返し連絡 / ヒアリング内容 / 次回アクション …"
              className="mt-1 w-full border border-gray-300 px-3 py-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">入力欄から外れたタイミングで自動保存します</p>
          </div>
          </>
          )}
        </div>
      )}

      {/* LINE Push モーダル */}
      {pushOpen && lead.lineUserId && (
        <LinePushModal
          leadId={lead.id}
          leadName={lead.name}
          onClose={() => setPushOpen(false)}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`press border-b-2 px-3 py-2 text-xs font-bold transition ${
        active
          ? "border-primary-500 text-primary-700"
          : "border-transparent text-gray-500 hover:text-gray-900"
      }`}
    >
      {children}
    </button>
  )
}

function HistoryPanel({ leadId }: { leadId: string }) {
  const [data, setData] = useState<{
    viewedJobs: ViewedJob[]
    clickedJobs: ClickedJob[]
    otherLeads: OtherLead[]
    sessionId: string | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetch(`/api/admin/line-leads/${leadId}/history`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j) => {
        if (j?.error) setError(j.error)
        else setData(j)
      })
      .catch((e) => {
        if (e instanceof Error && e.name === "AbortError") return
        setError(e instanceof Error ? e.message : "通信エラー")
      })
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [leadId])

  if (loading)
    return (
      <div className="flex items-center justify-center py-8 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        履歴を取得中…
      </div>
    )
  if (error)
    return (
      <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        {error}
      </div>
    )
  if (!data) return null

  const empty =
    data.viewedJobs.length === 0 &&
    data.clickedJobs.length === 0 &&
    data.otherLeads.length === 0

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        sessionId: <code className="font-mono">{data.sessionId ?? "（無し: 紐付け不可）"}</code>
      </p>

      {empty && (
        <p className="text-sm text-gray-500">関連する閲覧・クリック履歴はまだありません。</p>
      )}

      {/* 閲覧履歴 */}
      {data.viewedJobs.length > 0 && (
        <section>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
            <Eye className="h-3.5 w-3.5 text-primary-500" />
            閲覧した求人 ({data.viewedJobs.length})
          </h4>
          <ul className="space-y-1.5">
            {data.viewedJobs.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/jobs/${v.job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press group flex items-start gap-2 border bg-white p-2 hover:border-primary-300"
                >
                  <span className="text-xs text-gray-400 tabular-nums shrink-0 mt-0.5">
                    {new Date(v.viewedAt).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600">
                      {v.job.title}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {v.job.prefecture}
                      {v.job.city ? ` ${v.job.city}` : ""}
                      {v.utm.source && ` · utm_source=${v.utm.source}`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* クリック履歴 */}
      {data.clickedJobs.length > 0 && (
        <section>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
            <MousePointerClick className="h-3.5 w-3.5 text-primary-500" />
            応募ボタンを押した求人 ({data.clickedJobs.length})
          </h4>
          <ul className="space-y-1.5">
            {data.clickedJobs.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/jobs/${c.job.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press group flex items-start gap-2 border bg-white p-2 hover:border-primary-300"
                >
                  <span className="text-xs text-gray-400 tabular-nums shrink-0 mt-0.5">
                    {new Date(c.clickedAt).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-primary-600">
                      {c.job.title}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {c.job.prefecture}
                      {c.job.city ? ` ${c.job.city}` : ""} · source={c.source}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 他の lead */}
      {data.otherLeads.length > 0 && (
        <section>
          <h4 className="flex items-center gap-1.5 text-xs font-bold text-gray-700 mb-2">
            <History className="h-3.5 w-3.5 text-primary-500" />
            同じ電話 / メールの他の lead ({data.otherLeads.length})
          </h4>
          <ul className="space-y-1.5">
            {data.otherLeads.map((l) => (
              <li
                key={l.id}
                className="flex items-start gap-2 border bg-white p-2"
              >
                <span className="text-xs text-gray-400 tabular-nums shrink-0 mt-0.5">
                  {new Date(l.createdAt).toLocaleString("ja-JP", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-900 line-clamp-1">
                    {l.name} <span className="text-xs text-gray-500 font-normal">({l.status})</span>
                  </p>
                  {l.job && (
                    <p className="text-xs text-gray-500 line-clamp-1">{l.job.title}</p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function LinePushModal({
  leadId,
  leadName,
  onClose,
}: {
  leadId: string
  leadName: string
  onClose: () => void
}) {
  // 検索 + 結果 + 選択 + 送信
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Array<{ id: string; title: string; prefecture: string; city: string | null }>>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [freeText, setFreeText] = useState("")
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<null | "sent" | string>(null)

  async function search(q: string) {
    if (!q.trim()) return
    setLoading(true)
    try {
      const url = `/api/jobs?q=${encodeURIComponent(q)}&limit=10`
      const res = await fetch(url)
      const j = await res.json().catch(() => ({}))
      setResults(j?.jobs ?? j?.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 5) next.add(id)
      return next
    })
  }

  async function send() {
    setSending(true)
    setFeedback(null)
    try {
      const res = await fetch(`/api/admin/line-leads/${leadId}/push-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobIds: Array.from(selected),
          freeText: freeText.trim() || undefined,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFeedback(j?.message ?? j?.error ?? `送信失敗 (${res.status})`)
      } else {
        setFeedback("sent")
      }
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "通信エラー")
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900">
              <Send className="h-5 w-5 text-[#06C755]" />
              LINE Push: {leadName} さんへ送信
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">求人を 1〜5 件選んで Push できます</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="press p-2 text-gray-400 hover:text-gray-700"
            aria-label="閉じる"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
              placeholder="求人タイトル / キーワードで検索"
              className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading}
              className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-400 px-4 py-2 text-sm font-bold text-white"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              検索
            </button>
          </form>

          {results.length > 0 && (
            <ul className="space-y-1.5">
              {results.map((r) => {
                const isSelected = selected.has(r.id)
                const disabledForSelection = !isSelected && selected.size >= 5
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => toggle(r.id)}
                      disabled={disabledForSelection}
                      className={`press w-full text-left flex items-start gap-2 border p-2 ${
                        isSelected
                          ? "border-primary-600 bg-primary-50"
                          : "border-gray-200 bg-white hover:border-primary-300"
                      } ${disabledForSelection ? "opacity-40 cursor-not-allowed" : ""}`}
                    >
                      <span
                        className={`mt-0.5 inline-block h-4 w-4 shrink-0 border-2 ${
                          isSelected ? "bg-primary-600 border-primary-600" : "border-gray-400"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 line-clamp-2">{r.title}</p>
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {r.prefecture}
                          {r.city ? ` ${r.city}` : ""}
                        </p>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700">
              追記メッセージ（任意）
            </label>
            <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              rows={3}
              placeholder="例: ご連絡ありがとうございます。ご希望に近い求人をお送りします。"
              className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
              maxLength={500}
            />
          </div>

          {feedback === "sent" && (
            <div className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <Check className="inline h-4 w-4 mr-1" />
              LINE Push を送信しました
            </div>
          )}
          {typeof feedback === "string" && feedback !== "sent" && (
            <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="inline h-4 w-4 mr-1" />
              {feedback}
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 p-3 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            {selected.size} / 5 件選択中
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="press border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50"
            >
              閉じる
            </button>
            <button
              type="button"
              onClick={send}
              disabled={selected.size === 0 || sending}
              className="press inline-flex items-center gap-1.5 bg-[#06C755] hover:bg-[#05A847] disabled:bg-gray-400 px-5 py-2 text-sm font-extrabold text-white"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {selected.size > 0 ? `${selected.size} 件を Push 送信` : "Push 送信"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function DefLabel({
  label,
  value,
  link,
}: {
  label: string
  value: string
  link?: string
}) {
  return (
    <div>
      <dt className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-xs text-gray-900">
        {link ? (
          <a href={link} className="text-primary-700 hover:underline">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
