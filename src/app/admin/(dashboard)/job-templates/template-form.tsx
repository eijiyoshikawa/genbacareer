"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Save, Trash2 } from "lucide-react"

const CATEGORIES = [
  { value: "construction", label: "建築・躯体" },
  { value: "civil", label: "土木" },
  { value: "electrical", label: "電気・設備" },
  { value: "interior", label: "内装・仕上げ" },
  { value: "demolition", label: "解体・産廃" },
  { value: "driver", label: "ドライバー・重機" },
  { value: "management", label: "施工管理" },
  { value: "survey", label: "測量・設計" },
] as const

export interface TemplateFormData {
  id?: string
  slug: string
  name: string
  category: string
  description: string
  requirements: string
  benefits: string
  tags: string
  salaryMin: string
  salaryMax: string
  hint: string
  sortOrder: string
  isActive: boolean
}

export function TemplateForm({
  initial,
}: {
  initial?: Partial<TemplateFormData> & { id?: string }
}) {
  const router = useRouter()
  const isEditing = !!initial?.id

  const [form, setForm] = useState<TemplateFormData>({
    id: initial?.id,
    slug: initial?.slug ?? "",
    name: initial?.name ?? "",
    category: initial?.category ?? "construction",
    description: initial?.description ?? "",
    requirements: initial?.requirements ?? "",
    benefits: initial?.benefits ?? "",
    tags: initial?.tags ?? "",
    salaryMin: initial?.salaryMin ?? "",
    salaryMax: initial?.salaryMax ?? "",
    hint: initial?.hint ?? "",
    sortOrder: initial?.sortOrder ?? "100",
    isActive: initial?.isActive ?? true,
  })

  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState("")

  function buildPayload() {
    return {
      slug: form.slug.trim(),
      name: form.name.trim(),
      category: form.category,
      description: form.description.trim(),
      requirements: form.requirements.trim() || null,
      benefits: form.benefits
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      tags: form.tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      hint: form.hint.trim() || null,
      sortOrder: Number(form.sortOrder) || 100,
      isActive: form.isActive,
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setError("")
    try {
      const url = isEditing
        ? `/api/admin/job-templates/${form.id}`
        : "/api/admin/job-templates"
      const method = isEditing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "保存に失敗しました")
        return
      }
      router.push("/admin/job-templates")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!isEditing) return
    if (!confirm(`「${form.name}」を削除しますか？`)) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/job-templates/${form.id}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "削除に失敗しました")
        return
      }
      router.push("/admin/job-templates")
      router.refresh()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="border bg-white p-6 shadow-sm space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-gray-700">
              slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              disabled={isEditing}
              className="mt-1 block w-full border px-3 py-2 text-sm disabled:bg-gray-100"
              placeholder="construction-tobi"
            />
            <p className="mt-1 text-xs text-gray-500">
              半角英数字とハイフン。一度作成すると変更不可。
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              並び順
            </label>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm"
              placeholder="100"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-gray-700">
              名前 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm"
              placeholder="鳶工（足場組立）"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              カテゴリ
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            仕事内容（テンプレ本文）<span className="text-red-500">*</span>
          </label>
          <textarea
            rows={10}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 block w-full border px-3 py-2 text-sm font-mono"
          />
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            応募要件
          </label>
          <textarea
            rows={4}
            value={form.requirements}
            onChange={(e) =>
              setForm({ ...form, requirements: e.target.value })
            }
            className="mt-1 block w-full border px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-bold text-gray-700">
              福利厚生（カンマ区切り）
            </label>
            <input
              type="text"
              value={form.benefits}
              onChange={(e) => setForm({ ...form, benefits: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm"
              placeholder="社会保険完備, 賞与あり"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              タグ（カンマ区切り）
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm"
              placeholder="未経験歓迎, 土日休み"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-bold text-gray-700">
              月給下限（円）
            </label>
            <input
              type="number"
              value={form.salaryMin}
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700">
              月給上限（円）
            </label>
            <input
              type="number"
              value={form.salaryMax}
              onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm({ ...form, isActive: e.target.checked })
                }
              />
              公開する
            </label>
            <p className="mt-1 text-xs text-gray-500">
              OFF にすると企業の wizard に表示されなくなります。
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700">
            ヒント（任意、wizard の一覧に表示）
          </label>
          <input
            type="text"
            value={form.hint}
            onChange={(e) => setForm({ ...form, hint: e.target.value })}
            className="mt-1 block w-full border px-3 py-2 text-sm"
            placeholder="高所作業・足場系。日給制も人気"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={submitting || deleting}
          onClick={handleSubmit}
          className="inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {isEditing ? "更新" : "作成"}
        </button>
        {isEditing && (
          <button
            type="button"
            disabled={submitting || deleting}
            onClick={handleDelete}
            className="inline-flex items-center gap-1.5 border border-red-300 bg-white hover:bg-red-50 px-4 py-2 text-sm font-bold text-red-600 disabled:opacity-50"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            削除
          </button>
        )}
        <Link
          href="/admin/job-templates"
          className="ml-auto text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          キャンセル
        </Link>
      </div>
    </div>
  )
}
