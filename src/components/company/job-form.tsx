"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { PREFECTURES } from "@/lib/constants"

const CATEGORIES = [
  { value: "driver", label: "ドライバー・運転" },
  { value: "construction", label: "建設・土木" },
  { value: "manufacturing", label: "製造・工場" },
  { value: "office", label: "事務" },
  { value: "sales", label: "営業・販売" },
  { value: "service", label: "サービス・介護" },
  { value: "it", label: "IT・情報処理" },
  { value: "other", label: "その他" },
]

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "正社員" },
  { value: "part_time", label: "パート・アルバイト" },
  { value: "contract", label: "契約社員" },
]

const SALARY_TYPES = [
  { value: "monthly", label: "月給" },
  { value: "hourly", label: "時給" },
  { value: "annual", label: "年俸" },
]

interface JobFormData {
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
  status: string
}

export function JobForm({
  companyId,
  initialData,
}: {
  companyId: string
  initialData?: JobFormData
}) {
  const router = useRouter()
  const isEditing = !!initialData?.id

  const [form, setForm] = useState({
    title: initialData?.title ?? "",
    category: initialData?.category ?? "driver",
    subcategory: initialData?.subcategory ?? "",
    employmentType: initialData?.employmentType ?? "full_time",
    description: initialData?.description ?? "",
    requirements: initialData?.requirements ?? "",
    salaryMin: initialData?.salaryMin?.toString() ?? "",
    salaryMax: initialData?.salaryMax?.toString() ?? "",
    salaryType: initialData?.salaryType ?? "monthly",
    prefecture: initialData?.prefecture ?? "",
    city: initialData?.city ?? "",
    address: initialData?.address ?? "",
    benefits: initialData?.benefits?.join(", ") ?? "",
    tags: initialData?.tags?.join(", ") ?? "",
    status: initialData?.status ?? "draft",
  })

  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  // useRef to capture submit intent synchronously before React flushes state
  const submitStatusRef = useRef<string>(form.status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    const body = {
      title: form.title,
      category: form.category,
      subcategory: form.subcategory || null,
      employmentType: form.employmentType || null,
      description: form.description || null,
      requirements: form.requirements || null,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : null,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : null,
      salaryType: form.salaryType || null,
      prefecture: form.prefecture,
      city: form.city || null,
      address: form.address || null,
      benefits: form.benefits
        ? form.benefits.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      tags: form.tags
        ? form.tags.split(",").map((s) => s.trim()).filter(Boolean)
        : [],
      status: submitStatusRef.current,
    }

    try {
      const url = isEditing
        ? `/api/company/jobs/${initialData.id}`
        : "/api/company/jobs"
      const method = isEditing ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "エラーが発生しました")
        return
      }

      router.push("/company/jobs")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // Suppress unused variable warning — companyId is used server-side for authorization
  void companyId

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            求人タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="例: 大型トラックドライバー（長距離）"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              職種カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
              雇用形態
            </label>
            <select
              value={form.employmentType}
              onChange={(e) =>
                setForm({ ...form, employmentType: e.target.value })
              }
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
          <label className="block text-sm font-medium text-gray-700">
            仕事内容
          </label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
            placeholder="必要な資格・経験など"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-5">
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
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
              onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
              onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
              placeholder="350000"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">勤務地</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              都道府県 <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={form.prefecture}
              onChange={(e) =>
                setForm({ ...form, prefecture: e.target.value })
              }
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">その他</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            福利厚生（カンマ区切り）
          </label>
          <input
            type="text"
            value={form.benefits}
            onChange={(e) => setForm({ ...form, benefits: e.target.value })}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
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
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
            placeholder="未経験歓迎, 土日休み, 残業少なめ"
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          name="status"
          disabled={loading}
          onClick={() => { submitStatusRef.current = "active" }}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : isEditing ? "更新して公開" : "公開する"}
        </button>
        <button
          type="submit"
          disabled={loading}
          onClick={() => { submitStatusRef.current = "draft" }}
          className="rounded-md border bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          下書き保存
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          キャンセル
        </button>
      </div>
    </form>
  )
}
