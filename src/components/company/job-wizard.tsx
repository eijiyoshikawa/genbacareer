"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { PREFECTURES } from "@/lib/constants"
import { CATEGORIES } from "@/lib/categories"
import { Sparkles, Loader2, Eye, ChevronRight, ChevronLeft, Save, Check, FileStack } from "lucide-react"
import { JobCard } from "@/components/jobs/job-card"
import { ComplianceWarnings } from "@/components/company/compliance-warnings"
import { type JobTemplate } from "@/lib/job-templates"

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "正社員" },
  { value: "part_time", label: "パート・アルバイト" },
  { value: "contract", label: "契約社員" },
] as const

const SALARY_TYPES = [
  { value: "monthly", label: "月給" },
  { value: "hourly", label: "時給" },
  { value: "annual", label: "年俸" },
] as const

export interface JobWizardData {
  id?: string
  title: string
  category: string
  subcategory: string | null
  employmentType: string | null
  description: string | null
  requirements: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  prefecture: string
  city: string | null
  address: string | null
  benefits: string[]
  tags: string[]
  videoUrls?: string[]
  status: string
}

type FormState = {
  title: string
  category: string
  subcategory: string
  employmentType: string
  description: string
  requirements: string
  salaryMin: string
  salaryMax: string
  salaryType: string
  prefecture: string
  city: string
  address: string
  benefits: string
  tags: string
  videoUrls: string
}

const STEPS = ["基本情報", "勤務地", "給与・条件", "プレビュー"] as const

const DRAFT_KEY = "genbacareer.job-wizard.draft"

function buildInitial(initial?: JobWizardData): FormState {
  return {
    title: initial?.title ?? "",
    category: initial?.category ?? "construction",
    subcategory: initial?.subcategory ?? "",
    employmentType: initial?.employmentType ?? "full_time",
    description: initial?.description ?? "",
    requirements: initial?.requirements ?? "",
    salaryMin: initial?.salaryMin?.toString() ?? "",
    salaryMax: initial?.salaryMax?.toString() ?? "",
    salaryType: initial?.salaryType ?? "monthly",
    prefecture: initial?.prefecture ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    benefits: initial?.benefits?.join(", ") ?? "",
    tags: initial?.tags?.join(", ") ?? "",
    videoUrls: initial?.videoUrls?.join("\n") ?? "",
  }
}

function toApiBody(form: FormState, status: string) {
  return {
    title: form.title.trim(),
    category: form.category,
    subcategory: form.subcategory.trim() || null,
    employmentType: form.employmentType || null,
    description: form.description.trim() || null,
    requirements: form.requirements.trim() || null,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryType: form.salaryType || null,
    prefecture: form.prefecture,
    city: form.city.trim() || null,
    address: form.address.trim() || null,
    benefits: form.benefits
      ? form.benefits.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
    tags: form.tags ? form.tags.split(",").map((s) => s.trim()).filter(Boolean) : [],
    videoUrls: form.videoUrls
      ? form.videoUrls
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 6)
      : [],
    status,
  }
}

export function JobWizard({
  companyId,
  initialData,
  templates = [],
}: {
  companyId: string
  initialData?: JobWizardData
  templates?: JobTemplate[]
}) {
  const router = useRouter()
  const isEditing = !!initialData?.id

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<FormState>(() => buildInitial(initialData))
  const [templatesOpen, setTemplatesOpen] = useState(!isEditing && !initialData && templates.length > 0)

  const applyTemplate = useCallback((t: JobTemplate) => {
    setForm((prev) => ({
      ...prev,
      category: t.category,
      // 空の項目だけテンプレで埋める。既に入力済みは尊重。
      description: prev.description || t.description,
      requirements: prev.requirements || t.requirements,
      benefits: prev.benefits || t.benefits.join(", "),
      tags: prev.tags || t.tags.join(", "),
      salaryMin: prev.salaryMin || (t.salaryMin ? String(t.salaryMin) : ""),
      salaryMax: prev.salaryMax || (t.salaryMax ? String(t.salaryMax) : ""),
    }))
    setTemplatesOpen(false)
  }, [])
  const [error, setError] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState<"title" | "description" | null>(null)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 新規作成時のみ localStorage に下書きを保存する（編集時は DB が真実）
  useEffect(() => {
    if (isEditing) return
    if (typeof window === "undefined") return
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw) as FormState
        // 必須キーが揃っているかゆるくチェック
        if (draft && typeof draft.title === "string") {
          setForm(draft)
          setSavedAt(new Date())
        }
      }
    } catch {
      // ignore parse errors
    }
  }, [isEditing])

  useEffect(() => {
    if (isEditing) return
    if (typeof window === "undefined") return
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
        setSavedAt(new Date())
      } catch {
        // quota/disabled — ignore
      }
    }, 800)
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    }
  }, [form, isEditing])

  void companyId

  const validateStep = useCallback(
    (current: number): string | null => {
      if (current === 0) {
        if (!form.title.trim()) return "求人タイトルを入力してください"
        if (!form.category) return "職種カテゴリを選択してください"
      }
      if (current === 1) {
        if (!form.prefecture) return "都道府県を選択してください"
      }
      if (current === 2) {
        if (form.salaryMin && form.salaryMax) {
          const min = Number(form.salaryMin)
          const max = Number(form.salaryMax)
          if (min > max) return "給与の下限は上限より小さい必要があります"
        }
      }
      return null
    },
    [form]
  )

  const goNext = useCallback(() => {
    const err = validateStep(step)
    if (err) {
      setError(err)
      return
    }
    setError("")
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }, [step, validateStep])

  const goPrev = useCallback(() => {
    setError("")
    setStep((s) => Math.max(s - 1, 0))
  }, [])

  async function handleSubmit(status: "active" | "draft") {
    for (let i = 0; i < STEPS.length - 1; i++) {
      const err = validateStep(i)
      if (err) {
        setError(err)
        setStep(i)
        return
      }
    }
    setSubmitting(true)
    setError("")

    try {
      const url = isEditing
        ? `/api/company/jobs/${initialData!.id}`
        : "/api/company/jobs"
      const method = isEditing ? "PUT" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApiBody(form, status)),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "保存に失敗しました")
        return
      }
      if (!isEditing && typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_KEY)
      }
      router.push("/company/jobs")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSubmitting(false)
    }
  }

  async function fetchTitleSuggestions() {
    setAiLoading("title")
    setError("")
    try {
      const res = await fetch("/api/company/jobs/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "title",
          category: form.category,
          prefecture: form.prefecture || "東京都",
          city: form.city || null,
          employmentType: form.employmentType || null,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          tags: form.tags
            ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "タイトル提案を取得できませんでした")
        return
      }
      const data = (await res.json()) as { titles: string[] }
      setTitleSuggestions(data.titles)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setAiLoading(null)
    }
  }

  async function fetchDescriptionDraft() {
    if (!form.title.trim()) {
      setError("仕事内容を生成するには、まず求人タイトルを入力してください")
      return
    }
    setAiLoading("description")
    setError("")
    try {
      const res = await fetch("/api/company/jobs/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "description",
          title: form.title,
          category: form.category,
          prefecture: form.prefecture || "東京都",
          city: form.city || null,
          employmentType: form.employmentType || null,
          salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
          salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
          benefits: form.benefits
            ? form.benefits.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
          tags: form.tags
            ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "仕事内容のドラフトを生成できませんでした")
        return
      }
      const data = (await res.json()) as { description: string }
      setForm((f) => ({ ...f, description: data.description }))
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setAiLoading(null)
    }
  }

  const benefitsArr = form.benefits
    ? form.benefits.split(",").map((s) => s.trim()).filter(Boolean)
    : []
  const tagsArr = form.tags
    ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
    : []

  // プレビュー用に JobCard が期待する shape にマップ
  const previewJob = {
    id: initialData?.id ?? "preview",
    title: form.title || "（タイトル未入力）",
    category: form.category,
    employmentType: form.employmentType || null,
    salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
    salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
    salaryType: form.salaryType || null,
    prefecture: form.prefecture || "—",
    city: form.city || null,
    source: "direct",
    tags: tagsArr,
    company: { name: "（プレビュー）", logoUrl: null },
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-5">
        {/* Step indicator */}
        <ol className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center">
              <button
                type="button"
                onClick={() => {
                  // 前ステップへの戻りは自由、未来は順次バリデーション
                  if (i <= step) {
                    setError("")
                    setStep(i)
                  }
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 border ${
                  i === step
                    ? "bg-primary-600 border-primary-600 text-white"
                    : i < step
                      ? "bg-primary-50 border-primary-200 text-primary-700"
                      : "bg-white border-gray-200 text-gray-500"
                }`}
              >
                <span className="tabular-nums">{i + 1}.</span>
                {label}
                {i < step && <Check className="h-3 w-3" />}
              </button>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-gray-300 mx-0.5" />
              )}
            </li>
          ))}
          {!isEditing && savedAt && (
            <li className="ml-auto flex items-center gap-1 text-xs text-gray-500 font-normal">
              <Save className="h-3 w-3" />
              下書き自動保存（{savedAt.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}）
            </li>
          )}
        </ol>

        {error && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Templates (step 0 only, new only) */}
        {step === 0 && !isEditing && templates.length > 0 && (
          <div className="border border-primary-200 bg-primary-50/40">
            <button
              type="button"
              onClick={() => setTemplatesOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left"
            >
              <span className="flex items-center gap-2 text-sm font-bold text-primary-800">
                <FileStack className="h-4 w-4" />
                テンプレートから作成（{templates.length} 件）
              </span>
              <span className="text-xs text-primary-700">
                {templatesOpen ? "閉じる" : "選ぶ"} →
              </span>
            </button>
            {templatesOpen && (
              <div className="border-t border-primary-200 px-5 py-4">
                <p className="text-xs text-gray-600 mb-3">
                  業界別のひな型を選ぶと「カテゴリ / 仕事内容 / 応募要件 / 福利厚生 / タグ / 給与」が一括で埋まります。
                  既に入力済みの項目は上書きされません。
                </p>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {templates.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => applyTemplate(t)}
                        className="group w-full border bg-white hover:bg-warm-50 hover:border-primary-300 px-3 py-2 text-left transition"
                      >
                        <p className="text-sm font-bold text-gray-900 group-hover:text-primary-700">
                          {t.name}
                        </p>
                        {t.hint && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                            {t.hint}
                          </p>
                        )}
                        {(t.salaryMin || t.salaryMax) && (
                          <p className="mt-1 text-xs text-primary-700 tabular-nums">
                            月給 {t.salaryMin?.toLocaleString() ?? "—"}
                            {" 〜 "}
                            {t.salaryMax?.toLocaleString() ?? "—"} 円
                          </p>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Step 0: basic */}
        {step === 0 && (
          <div className="border bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  求人タイトル <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  disabled={aiLoading !== null}
                  onClick={fetchTitleSuggestions}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800 disabled:opacity-50"
                >
                  {aiLoading === "title" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI 提案
                </button>
              </div>
              <input
                type="text"
                maxLength={200}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
                placeholder="例: 大型トラックドライバー（長距離）"
              />
              {titleSuggestions.length > 0 && (
                <ul className="mt-2 grid gap-1.5">
                  {titleSuggestions.map((t) => (
                    <li key={t}>
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, title: t })
                          setTitleSuggestions([])
                        }}
                        className="w-full text-left border bg-primary-50/50 hover:bg-primary-50 px-3 py-2 text-sm text-gray-800"
                      >
                        {t}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  職種カテゴリ <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                >
                  {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  雇用形態
                </label>
                <select
                  value={form.employmentType}
                  onChange={(e) =>
                    setForm({ ...form, employmentType: e.target.value })
                  }
                  className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                >
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  仕事内容
                </label>
                <button
                  type="button"
                  disabled={aiLoading !== null}
                  onClick={fetchDescriptionDraft}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary-700 hover:text-primary-800 disabled:opacity-50"
                >
                  {aiLoading === "description" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  AI ドラフト
                </button>
              </div>
              <textarea
                rows={7}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                placeholder="仕事の詳細な内容を記入してください"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                応募要件
              </label>
              <textarea
                rows={3}
                value={form.requirements}
                onChange={(e) =>
                  setForm({ ...form, requirements: e.target.value })
                }
                className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                placeholder="必要な資格・経験など"
              />
            </div>

            {/* コンプライアンス警告 — 差別表現の検出 */}
            <ComplianceWarnings
              title={form.title}
              description={form.description}
              requirements={form.requirements}
            />
          </div>
        )}

        {/* Step 1: location */}
        {step === 1 && (
          <div className="border bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">勤務地</h2>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  都道府県 <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.prefecture}
                  onChange={(e) =>
                    setForm({ ...form, prefecture: e.target.value })
                  }
                  className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                >
                  <option value="">選択してください</option>
                  {PREFECTURES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  市区町村
                </label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                  placeholder="例: 新宿区"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                詳細住所
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                placeholder="番地・建物名"
              />
            </div>
          </div>
        )}

        {/* Step 2: salary + benefits */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="border bg-white p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">給与</h2>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    給与種別
                  </label>
                  <select
                    value={form.salaryType}
                    onChange={(e) =>
                      setForm({ ...form, salaryType: e.target.value })
                    }
                    className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                  >
                    {SALARY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    下限（円）
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.salaryMin}
                    onChange={(e) =>
                      setForm({ ...form, salaryMin: e.target.value })
                    }
                    className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                    placeholder="200000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    上限（円）
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.salaryMax}
                    onChange={(e) =>
                      setForm({ ...form, salaryMax: e.target.value })
                    }
                    className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                    placeholder="350000"
                  />
                </div>
              </div>
            </div>

            <div className="border bg-white p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">その他</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  福利厚生（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={form.benefits}
                  onChange={(e) =>
                    setForm({ ...form, benefits: e.target.value })
                  }
                  className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                  placeholder="社会保険完備, 交通費支給, 賞与あり"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  タグ（カンマ区切り）
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
                  placeholder="未経験歓迎, 土日休み, 残業少なめ"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  動画 URL（YouTube / TikTok / Vimeo、1 行 1 URL、最大 6 本）
                </label>
                <textarea
                  rows={3}
                  value={form.videoUrls}
                  onChange={(e) =>
                    setForm({ ...form, videoUrls: e.target.value })
                  }
                  className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm font-mono"
                  placeholder={"https://youtu.be/XXXXXXXXXXX\nhttps://www.tiktok.com/@user/video/0000000000000000000"}
                />
                <p className="mt-1 text-xs text-gray-500">
                  現場の様子・社員インタビュー・1 日の流れなどの動画を掲載できます。求人詳細ページで埋め込み表示されます。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: review */}
        {step === 3 && (
          <div className="border bg-white p-6 shadow-sm space-y-5">
            <h2 className="text-lg font-semibold text-gray-900">プレビューと公開</h2>
            <p className="text-sm text-gray-500">
              内容をご確認のうえ、「公開」または「下書き保存」を選択してください。
            </p>

            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row label="タイトル" value={form.title} />
              <Row label="カテゴリ" value={categoryLabel(form.category)} />
              <Row label="雇用形態" value={employmentLabel(form.employmentType)} />
              <Row
                label="勤務地"
                value={[form.prefecture, form.city].filter(Boolean).join(" ") || "—"}
              />
              <Row
                label="給与"
                value={salaryLabel(form.salaryType, form.salaryMin, form.salaryMax)}
              />
              <Row label="福利厚生" value={benefitsArr.join(", ") || "—"} />
              <Row label="タグ" value={tagsArr.join(", ") || "—"} />
            </dl>

            {form.description && (
              <div>
                <p className="text-xs font-bold text-gray-500">仕事内容</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                  {form.description}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-wrap items-center gap-3">
          {step > 0 && (
            <button
              type="button"
              onClick={goPrev}
              className="inline-flex items-center gap-1 border bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4" />
              戻る
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={goNext}
              className="inline-flex items-center gap-1 bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
            >
              次へ
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit("active")}
                className="inline-flex items-center gap-1 bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
              >
                {submitting ? "保存中..." : isEditing ? "更新して公開" : "公開する"}
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleSubmit("draft")}
                className="inline-flex items-center gap-1 border bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                下書き保存
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => router.back()}
            className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            キャンセル
          </button>
        </div>
      </div>

      {/* Live preview rail */}
      <aside className="lg:sticky lg:top-6 self-start">
        <div className="border bg-warm-50 p-4">
          <p className="flex items-center gap-1 text-xs font-bold text-gray-500">
            <Eye className="h-3.5 w-3.5" />
            求人カード プレビュー
          </p>
          <div className="mt-2 bg-white">
            <JobCard job={previewJob} />
          </div>
          <p className="mt-3 text-xs text-gray-500 leading-relaxed">
            実際に求職者の検索結果に表示される見え方です。タイトル・給与・所在地・タグを書くと埋まっていきます。
          </p>
        </div>
      </aside>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-bold text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{value || "—"}</dd>
    </div>
  )
}

function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}

function employmentLabel(value: string | null): string {
  if (!value) return "—"
  return EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? value
}

function salaryLabel(
  type: string | null,
  min: string,
  max: string
): string {
  if (!min && !max) return "—"
  const t = SALARY_TYPES.find((s) => s.value === type)?.label ?? "月給"
  const fmt = (s: string) => Number(s).toLocaleString()
  if (min && max) return `${t} ${fmt(min)} 〜 ${fmt(max)} 円`
  if (min) return `${t} ${fmt(min)} 円〜`
  return `${t} 〜 ${fmt(max)} 円`
}
