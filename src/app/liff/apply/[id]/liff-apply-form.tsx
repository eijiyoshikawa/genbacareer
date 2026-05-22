"use client"

import { useEffect, useState } from "react"
import { Loader2, MessageCircle, AlertCircle, Check, User, Phone, Mail, Briefcase } from "lucide-react"

interface RecommendedJob {
  id: string
  title: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
}

type Stage = "init" | "ready" | "submitting" | "done" | "error"

export function LiffApplyForm({
  liffId,
  jobId,
  jobTitle,
}: {
  liffId: string
  jobId: string
  jobTitle: string
}) {
  const [stage, setStage] = useState<Stage>("init")
  const [error, setError] = useState<string | null>(null)
  const [profile, setProfile] = useState<{
    userId: string
    displayName: string
  } | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    experienceYears: "",
    notes: "",
  })
  const [recommended, setRecommended] = useState<RecommendedJob[]>([])

  // LIFF 初期化
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (!liffId) {
        setStage("error")
        setError("LIFF ID が未設定です。管理者にお問い合わせください。")
        return
      }
      try {
        const liffModule = await import("@line/liff")
        const liff = liffModule.default
        await liff.init({ liffId })
        if (cancelled) return
        if (!liff.isLoggedIn()) {
          // LINE アプリ外ブラウザ等で開かれた場合: LINE ログインに飛ばす
          liff.login({ redirectUri: window.location.href })
          return
        }
        const p = await liff.getProfile()
        const token = liff.getAccessToken()
        if (cancelled) return
        setProfile({ userId: p.userId, displayName: p.displayName })
        setAccessToken(token)
        setForm((f) => ({ ...f, name: f.name || p.displayName }))
        setStage("ready")
      } catch (e) {
        if (cancelled) return
        setStage("error")
        setError(e instanceof Error ? e.message : "LIFF 初期化に失敗しました")
      }
    }
    init()
    return () => {
      cancelled = true
    }
  }, [liffId])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!profile || !accessToken) return
    setStage("submitting")
    setError(null)
    try {
      const res = await fetch("/api/applications/liff-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          experienceYears: form.experienceYears
            ? Number(form.experienceYears)
            : null,
          notes: form.notes.trim() || null,
          lineUserId: profile.userId,
          lineDisplayName: profile.displayName,
          accessToken,
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(json?.error ?? `送信失敗 (${res.status})`)
        setStage("ready")
        return
      }
      if (Array.isArray(json.recommendedJobs)) {
        setRecommended(json.recommendedJobs as RecommendedJob[])
      }
      setStage("done")
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信エラー")
      setStage("ready")
    }
  }

  async function closeLiff() {
    try {
      const liff = (await import("@line/liff")).default
      if (liff.isInClient()) liff.closeWindow()
    } catch {
      // ignore
    }
  }

  if (stage === "init") {
    return (
      <div className="flex items-center justify-center py-16 text-sm text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        LINE と連携中…
      </div>
    )
  }

  if (stage === "error") {
    return (
      <div className="border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        {error}
      </div>
    )
  }

  if (stage === "done") {
    return (
      <div className="space-y-4">
        <div className="border border-emerald-300 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-base font-extrabold text-emerald-900">
            <Check className="h-5 w-5" />
            応募ありがとうございます
          </p>
          <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
            「{jobTitle}」へのご応募を受け付けました。担当より 1 営業日以内に LINE のトークでご連絡いたします。
          </p>
        </div>

        {recommended.length > 0 && (
          <div className="border bg-white p-3">
            <p className="text-sm font-bold text-gray-900 mb-2 section-bar">
              他にも気になる求人はありませんか？
            </p>
            <ul className="space-y-1.5">
              {recommended.map((r) => (
                <li key={r.id}>
                  <a
                    href={`https://www.genbacareer.jp/jobs/${r.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="press block accent-l border bg-white p-2 pl-3 hover:border-primary-300"
                  >
                    <p className="text-sm font-bold text-gray-900 line-clamp-2">
                      {r.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {r.prefecture}
                      {r.city ? ` ${r.city}` : ""}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          onClick={closeLiff}
          className="press w-full bg-[#06C755] hover:bg-[#05A847] px-6 py-3 text-base font-bold text-white"
        >
          LINE トークに戻る
        </button>
      </div>
    )
  }

  // stage === "ready" or "submitting"
  return (
    <form onSubmit={submit} className="space-y-3">
      {profile && (
        <div className="border border-[#06C755]/30 bg-[#06C755]/5 p-3 text-xs text-gray-700">
          <p>
            LINE で連携済み:{" "}
            <span className="font-bold">{profile.displayName}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            返信は LINE のトークに直接届きます
          </p>
        </div>
      )}

      <Field
        id="liff-name"
        label="お名前"
        required
        icon={<User className="h-4 w-4 text-primary-500" />}
        type="text"
        autoComplete="name"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
      />
      <Field
        id="liff-phone"
        label="電話番号"
        required
        icon={<Phone className="h-4 w-4 text-primary-500" />}
        type="tel"
        autoComplete="tel"
        placeholder="090-1234-5678"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
      />
      <Field
        id="liff-email"
        label="メールアドレス"
        required
        icon={<Mail className="h-4 w-4 text-primary-500" />}
        type="email"
        autoComplete="email"
        placeholder="yamada@example.com"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />
      <Field
        id="liff-exp"
        label="建設業の経験年数"
        icon={<Briefcase className="h-4 w-4 text-primary-500" />}
        type="number"
        min={0}
        max={60}
        placeholder="任意"
        value={form.experienceYears}
        onChange={(v) => setForm({ ...form, experienceYears: v })}
      />
      <div>
        <label htmlFor="liff-notes" className="block text-xs font-bold text-gray-700">
          ご質問・希望条件など <span className="text-gray-400">(任意)</span>
        </label>
        <textarea
          id="liff-notes"
          rows={3}
          placeholder="例: 寮完備の現場を希望"
          className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          <AlertCircle className="inline h-3 w-3 mr-1" />
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={stage === "submitting"}
        className="press flex w-full items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05A847] disabled:opacity-60 px-6 py-4 text-base font-extrabold text-white shadow-sm"
      >
        {stage === "submitting" ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            送信中…
          </>
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            応募する
          </>
        )}
      </button>
      <p className="text-xs text-gray-400 leading-relaxed">
        ご入力情報は応募対応以外の目的で使用しません。
      </p>
    </form>
  )
}

function Field({
  id,
  label,
  required,
  icon,
  type,
  placeholder,
  value,
  onChange,
  autoComplete,
  min,
  max,
}: {
  id: string
  label: string
  required?: boolean
  icon: React.ReactNode
  type: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
  autoComplete?: string
  min?: number
  max?: number
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-bold text-gray-700">
        {label}
        {required ? (
          <span className="ml-1 text-red-600">*</span>
        ) : (
          <span className="ml-1 text-gray-400">(任意)</span>
        )}
      </label>
      <div className="mt-1 flex items-center gap-2 border border-gray-300 bg-white px-3 py-2 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
        {icon}
        <input
          id={id}
          type={type}
          required={required}
          autoComplete={autoComplete}
          min={min}
          max={max}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
        />
      </div>
    </div>
  )
}
