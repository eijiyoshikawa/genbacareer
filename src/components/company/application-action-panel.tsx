"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  CalendarClock,
  MapPin,
  FileText,
  Loader2,
  Save,
  AlertTriangle,
} from "lucide-react"

const STATUS_FLOW: Record<
  string,
  { label: string; next: { value: string; label: string; tone: "primary" | "danger" }[] }
> = {
  applied: {
    label: "応募済み",
    next: [
      { value: "reviewing", label: "選考開始", tone: "primary" },
      { value: "rejected", label: "不採用", tone: "danger" },
    ],
  },
  reviewing: {
    label: "選考中",
    next: [
      { value: "interview", label: "面接へ進む", tone: "primary" },
      { value: "rejected", label: "不採用", tone: "danger" },
    ],
  },
  interview: {
    label: "面接",
    next: [
      { value: "offered", label: "内定を出す", tone: "primary" },
      { value: "rejected", label: "不採用", tone: "danger" },
    ],
  },
  offered: {
    label: "内定",
    next: [
      { value: "hired", label: "採用を確定", tone: "primary" },
      { value: "rejected", label: "辞退・不採用", tone: "danger" },
    ],
  },
  hired: { label: "採用", next: [] },
  rejected: { label: "不採用", next: [] },
}

export function ApplicationActionPanel({
  applicationId,
  currentStatus,
  internalNotes: initialNotes,
  interviewAt: initialInterviewAt,
  interviewVenue: initialVenue,
  interviewUrl: initialInterviewUrl = "",
}: {
  applicationId: string
  currentStatus: string
  internalNotes: string
  interviewAt: string | null
  interviewVenue: string
  interviewUrl?: string
}) {
  const router = useRouter()
  const flow = STATUS_FLOW[currentStatus] ?? { label: currentStatus, next: [] }

  const [notes, setNotes] = useState(initialNotes)
  const [interviewLocal, setInterviewLocal] = useState(
    initialInterviewAt ? toLocalInputValue(new Date(initialInterviewAt)) : ""
  )
  const [venue, setVenue] = useState(initialVenue)
  const [interviewUrl, setInterviewUrl] = useState(initialInterviewUrl)
  const [statusNote, setStatusNote] = useState("")
  const [pendingAction, setPendingAction] = useState<string | null>(null)
  const [notesSaving, setNotesSaving] = useState(false)
  const [scheduleSaving, setScheduleSaving] = useState(false)
  const [error, setError] = useState("")
  const [savedFlash, setSavedFlash] = useState<"notes" | "schedule" | null>(null)

  async function transition(toStatus: string) {
    if (currentStatus === toStatus) return
    setPendingAction(toStatus)
    setError("")
    try {
      const res = await fetch(`/api/company/applications/${applicationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: toStatus,
          note: statusNote || undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "ステータス変更に失敗しました")
        return
      }
      setStatusNote("")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setPendingAction(null)
    }
  }

  async function saveNotes() {
    setNotesSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/company/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ internalNotes: notes || null }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "メモの保存に失敗しました")
        return
      }
      setSavedFlash("notes")
      setTimeout(() => setSavedFlash(null), 2000)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setNotesSaving(false)
    }
  }

  async function saveSchedule() {
    setScheduleSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/company/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interviewAt: interviewLocal ? fromLocalInputValue(interviewLocal) : null,
          interviewVenue: venue || null,
          interviewUrl: interviewUrl || null,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "面接日時の保存に失敗しました")
        return
      }
      setSavedFlash("schedule")
      setTimeout(() => setSavedFlash(null), 2000)
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setScheduleSaving(false)
    }
  }

  return (
    <div className="space-y-4 lg:sticky lg:top-6">
      {error && (
        <div className="flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Status transition */}
      <section className="border bg-white p-4 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900">選考アクション</h2>
        <p className="mt-1 text-xs text-gray-500">
          現在: <span className="font-bold">{flow.label}</span>
        </p>

        {flow.next.length > 0 ? (
          <>
            <textarea
              rows={2}
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              placeholder="変更理由・メモ（任意 / 求職者には届きません）"
              className="mt-3 block w-full border px-3 py-2 text-xs shadow-sm"
            />
            <div className="mt-3 grid gap-2">
              {flow.next.map((n) => (
                <button
                  key={n.value}
                  type="button"
                  disabled={pendingAction !== null}
                  onClick={() => transition(n.value)}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold disabled:opacity-50 ${
                    n.tone === "primary"
                      ? "bg-primary-600 hover:bg-primary-700 text-white"
                      : "border border-red-300 bg-white text-red-600 hover:bg-red-50"
                  }`}
                >
                  {pendingAction === n.value && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  {n.label} →
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">
              ステータス変更時に、求職者へ自動メール通知が送信されます。
            </p>
          </>
        ) : (
          <p className="mt-3 text-xs text-gray-500">
            このステータスは終端のため、次のアクションはありません。
          </p>
        )}
      </section>

      {/* Interview scheduling */}
      <section className="border bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <CalendarClock className="h-4 w-4 text-primary-600" />
          面接日時調整
        </h2>
        <div className="mt-3 space-y-3">
          <div>
            <label className="block text-xs font-bold text-gray-600">面接日時</label>
            <input
              type="datetime-local"
              value={interviewLocal}
              onChange={(e) => setInterviewLocal(e.target.value)}
              className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600">
              <MapPin className="inline h-3 w-3 mr-0.5" />
              場所 / 会場
            </label>
            <input
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="本社 / 現場事務所 など"
              className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600">
              オンライン面接 URL (14.5)
            </label>
            <input
              type="url"
              value={interviewUrl}
              onChange={(e) => setInterviewUrl(e.target.value)}
              placeholder="https://us05web.zoom.us/j/..."
              className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
            />
            <p className="mt-0.5 text-[10px] text-gray-400">
              Zoom / Google Meet / Teams 等の参加 URL。求職者の応募詳細にも表示されます。
            </p>
          </div>
          <button
            type="button"
            disabled={scheduleSaving}
            onClick={saveSchedule}
            className="inline-flex items-center justify-center gap-1.5 w-full bg-primary-600 hover:bg-primary-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {scheduleSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            面接情報を保存
            {savedFlash === "schedule" && (
              <span className="text-xs font-normal">保存しました</span>
            )}
          </button>
        </div>
      </section>

      {/* Internal notes */}
      <section className="border bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
          <FileText className="h-4 w-4 text-primary-600" />
          社内メモ
        </h2>
        <textarea
          rows={6}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="この応募者についての社内メモ（求職者には公開されません）"
          className="mt-3 block w-full border px-3 py-2 text-sm shadow-sm"
        />
        <button
          type="button"
          disabled={notesSaving}
          onClick={saveNotes}
          className="mt-3 inline-flex items-center justify-center gap-1.5 w-full bg-primary-600 hover:bg-primary-700 px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {notesSaving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          メモを保存
          {savedFlash === "notes" && (
            <span className="text-xs font-normal">保存しました</span>
          )}
        </button>
      </section>
    </div>
  )
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function fromLocalInputValue(v: string): string {
  // datetime-local は秒なし「YYYY-MM-DDTHH:mm」。ローカルタイムゾーンで Date を作る。
  const d = new Date(v)
  return d.toISOString()
}
