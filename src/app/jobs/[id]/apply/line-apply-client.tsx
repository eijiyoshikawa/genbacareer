"use client"

import { useState } from "react"
import Link from "next/link"
import { MessageCircle, Loader2, ExternalLink, User, Phone, Mail, Briefcase, Banknote, MapPin, ArrowRight, Building2 } from "lucide-react"
import { gaTrackLead } from "@/lib/ga4"
import { TemplateInserter } from "@/components/applications/template-inserter"

interface RecommendedJob {
  id: string
  title: string
  category: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  tags: string[]
  companyName: string | null
}

/**
 * 「LINE で応募」のミニフォーム + 遷移コンポーネント。
 *
 * 旧フロー: 求人詳細 → クリック計測のみで即 LINE 遷移
 * 新フロー: ミニフォーム（氏名 / 電話 / メール 必須）→ /api/applications/line-lead に
 *           保存 → 返却された LINE URL に遷移（モバイルは自動 / デスクトップは QR + ボタン）
 *
 * 既存の clickedRedirect 計測機能は API 側で代替される。
 */
export function LineApplyClient({
  jobId,
  isMobileGuess,
  lineOaId,
}: {
  jobId: string
  isMobileGuess: boolean
  lineOaId: string
}) {
  const [submitting, setSubmitting] = useState(false)
  const [lineUrl, setLineUrl] = useState<string | null>(null)
  const [recommendedJobs, setRecommendedJobs] = useState<RecommendedJob[]>([])
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    experienceYears: "",
    notes: "",
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const res = await fetch("/api/applications/line-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          experienceYears: form.experienceYears ? Number(form.experienceYears) : null,
          notes: form.notes.trim() || null,
          // 流入分析用に現在ページの URL を一緒に送る（UTM が乗ってくる）
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok || !json?.lineUrl) {
        setError(json?.error ?? "送信に失敗しました")
        setSubmitting(false)
        return
      }
      setLineUrl(json.lineUrl)
      if (Array.isArray(json.recommendedJobs)) {
        setRecommendedJobs(json.recommendedJobs as RecommendedJob[])
      }
      // GA4 conversion イベント
      gaTrackLead({ leadId: json.leadId ?? null, jobId })
      // モバイル: 自動遷移（短いディレイを挟む）
      // ただしレコメンドが出る場合はユーザーに見せたいのでスキップ
      if (isMobileGuess && (!json.recommendedJobs || json.recommendedJobs.length === 0)) {
        setTimeout(() => {
          window.location.href = json.lineUrl
        }, 600)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "通信エラーが発生しました")
      setSubmitting(false)
    }
  }

  // LINE URL 取得後の表示（QR + ボタン）
  if (lineUrl) {
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(lineUrl)}`
    return (
      <div className="mt-6 space-y-4">
        <div className="border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          ご入力ありがとうございます。続けて LINE でメッセージを送信してください。
        </div>
        <a
          href={lineUrl}
          className="press flex w-full items-center justify-center gap-2 bg-[#06C755] px-6 py-4 text-base font-bold text-white shadow-sm transition hover:bg-[#05A847]"
        >
          <MessageCircle className="h-5 w-5" />
          LINE を開く
          <ExternalLink className="h-4 w-4 opacity-70" />
        </a>

        {!isMobileGuess && (
          <div className="mt-6 border border-gray-200 bg-gray-50 p-4 text-center">
            <p className="text-sm text-gray-700 font-medium">
              スマートフォンで LINE を開きたい方
            </p>
            <p className="mt-1 text-xs text-gray-500">
              QR を LINE で読み取ると応募メッセージが事前入力されます
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              alt="LINE 応募用 QR コード"
              width={180}
              height={180}
              className="mx-auto mt-3"
              loading="lazy"
            />
            <p className="mt-2 text-xs text-gray-400">
              LINE 公式アカウント ID: {lineOaId || "（未設定）"}
            </p>
          </div>
        )}

        {/* あなたへのおすすめ求人 */}
        {recommendedJobs.length > 0 && (
          <div className="mt-8 border-t pt-6">
            <h3 className="flex items-center gap-2 text-base font-extrabold text-gray-900 section-bar">
              他にも気になる求人はありませんか？
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              ご応募の傾向に近い建設業の求人です。気になる求人があれば、続けて LINE でお送りください。
            </p>
            <ul className="mt-3 space-y-2">
              {recommendedJobs.map((rec) => (
                <li key={rec.id}>
                  <Link
                    href={`/jobs/${rec.id}`}
                    className="press group block accent-l border bg-white p-3 pl-4 hover:border-primary-400 hover:shadow-sm transition"
                  >
                    <p className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600">
                      {rec.title}
                    </p>
                    {rec.companyName && (
                      <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                        <Building2 className="inline h-3 w-3 mr-1 text-gray-400" />
                        {rec.companyName}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                      <span className="inline-flex items-center gap-1 text-primary-700 font-bold">
                        <Banknote className="h-3 w-3" />
                        {formatSalary(rec.salaryMin, rec.salaryMax, rec.salaryType)}
                      </span>
                      <span className="inline-flex items-center gap-1 text-gray-600">
                        <MapPin className="h-3 w-3 text-gray-400" />
                        {rec.prefecture}
                        {rec.city ? ` ${rec.city}` : ""}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="/jobs"
              className="press mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
            >
              他の求人も探す
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ミニフォーム表示
  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <p className="text-xs text-gray-500 leading-relaxed">
        担当者からの折り返し連絡のため、最低限のご連絡先をご入力ください。
        個人情報は応募対応以外の目的では使用しません。
      </p>

      <Field
        id="lead-name"
        label="お名前"
        required
        icon={<User className="h-4 w-4 text-primary-500" />}
        type="text"
        autoComplete="name"
        placeholder="例: 山田 太郎"
        value={form.name}
        onChange={(v) => setForm({ ...form, name: v })}
      />
      <Field
        id="lead-phone"
        label="電話番号"
        required
        icon={<Phone className="h-4 w-4 text-primary-500" />}
        type="tel"
        autoComplete="tel"
        placeholder="例: 090-1234-5678"
        value={form.phone}
        onChange={(v) => setForm({ ...form, phone: v })}
      />
      <Field
        id="lead-email"
        label="メールアドレス"
        required
        icon={<Mail className="h-4 w-4 text-primary-500" />}
        type="email"
        autoComplete="email"
        placeholder="例: yamada@example.com"
        value={form.email}
        onChange={(v) => setForm({ ...form, email: v })}
      />
      <Field
        id="lead-exp"
        label="建設業の経験年数"
        icon={<Briefcase className="h-4 w-4 text-primary-500" />}
        type="number"
        min={0}
        max={60}
        placeholder="任意（例: 3）"
        value={form.experienceYears}
        onChange={(v) => setForm({ ...form, experienceYears: v })}
      />
      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="lead-notes" className="block text-xs font-bold text-gray-700">
            ご質問・希望条件など <span className="text-gray-400">(任意)</span>
          </label>
          <TemplateInserter
            onInsert={(tpl) =>
              setForm((prev) => ({
                ...prev,
                notes: prev.notes ? `${prev.notes}\n${tpl}` : tpl,
              }))
            }
          />
        </div>
        <textarea
          id="lead-notes"
          rows={3}
          placeholder="例: 寮完備の現場を希望、平日連絡可"
          className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>

      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-xs text-red-800">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="press flex w-full items-center justify-center gap-2 bg-[#06C755] px-6 py-4 text-base font-extrabold text-white shadow-sm transition hover:bg-[#05A847] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {submitting ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            送信中…
          </>
        ) : (
          <>
            <MessageCircle className="h-5 w-5" />
            内容を確認して LINE で送る
          </>
        )}
      </button>

      <p className="text-xs text-gray-400 leading-relaxed">
        「LINE で送る」を押すと、ご入力情報を当社に送信し、続いて LINE 公式アカウントが
        起動します。LINE のチャット画面で送信ボタンを押すと応募が完了します。
        <br />
        ご入力情報の取り扱いは <Link href="/privacy" className="text-primary-600 underline">プライバシーポリシー</Link> をご参照ください。
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
        {required ? <span className="ml-1 text-red-600">*</span> : <span className="ml-1 text-gray-400">(任意)</span>}
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

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  if (!min) return "応相談"
  const unit = type === "hourly" ? "時給" : type === "annual" ? "年収" : "月給"
  const fmt = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(0)}万` : `${n.toLocaleString()}`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  return `${unit} ${fmt(min)}円〜`
}
