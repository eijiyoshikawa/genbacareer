"use client"

import { useState } from "react"
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

interface ProfileFormData {
  name: string
  phone: string
  prefecture: string
  city: string
  birthDate: string
  desiredCategories: string[]
  desiredSalaryMin: string
  profilePublic: boolean
  resumeUrl: string | null
}

export function ProfileForm({ initialData }: { initialData: ProfileFormData }) {
  const router = useRouter()
  const [form, setForm] = useState(initialData)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resumeUploading, setResumeUploading] = useState(false)

  async function uploadResume(file: File) {
    setError("")
    setResumeUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/users/me/resume", {
        method: "POST",
        body: fd,
      })
      const data = (await res.json().catch(() => null)) as
        | { resumeUrl?: string; error?: string }
        | null
      if (!res.ok) {
        setError(data?.error ?? "アップロードに失敗しました")
        return
      }
      setForm((f) => ({ ...f, resumeUrl: data?.resumeUrl ?? null }))
    } finally {
      setResumeUploading(false)
    }
  }

  async function deleteResume() {
    if (!confirm("履歴書を削除しますか？")) return
    const res = await fetch("/api/users/me/resume", { method: "DELETE" })
    if (res.ok) setForm((f) => ({ ...f, resumeUrl: null }))
  }

  function toggleCategory(value: string) {
    setForm((prev) => ({
      ...prev,
      desiredCategories: prev.desiredCategories.includes(value)
        ? prev.desiredCategories.filter((c) => c !== value)
        : [...prev.desiredCategories, value],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess(false)
    setLoading(true)

    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name || null,
          phone: form.phone || null,
          prefecture: form.prefecture || null,
          city: form.city || null,
          birthDate: form.birthDate || null,
          desiredCategories: form.desiredCategories,
          desiredSalaryMin: form.desiredSalaryMin
            ? Number(form.desiredSalaryMin)
            : null,
          profilePublic: form.profilePublic,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "エラーが発生しました")
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-md bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md bg-green-50 p-4 text-sm text-green-600">
          プロフィールを更新しました
        </div>
      )}

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">基本情報</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            お名前
          </label>
          <input
            type="text"
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            電話番号
          </label>
          <input
            type="tel"
            maxLength={20}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
            placeholder="090-1234-5678"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              都道府県
            </label>
            <select
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
              maxLength={50}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            生年月日
          </label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">希望条件</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            希望職種（複数選択可）
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => toggleCategory(c.value)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition ${
                  form.desiredCategories.includes(c.value)
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            希望月収（下限・円）
          </label>
          <input
            type="number"
            min={0}
            value={form.desiredSalaryMin}
            onChange={(e) =>
              setForm({ ...form, desiredSalaryMin: e.target.value })
            }
            className="mt-1 block w-full rounded-md border px-3 py-2 text-sm shadow-sm"
            placeholder="200000"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">履歴書</h2>
        {form.resumeUrl ? (
          <div className="flex items-center gap-3 text-sm">
            <a
              href={form.resumeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              アップロード済みの履歴書を開く
            </a>
            <button
              type="button"
              onClick={deleteResume}
              className="text-red-600 hover:text-red-700"
            >
              削除
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-500">まだアップロードされていません</p>
        )}
        <input
          type="file"
          accept="application/pdf,image/jpeg,image/png"
          disabled={resumeUploading}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadResume(file)
          }}
          className="block text-sm"
        />
        <p className="text-xs text-gray-500">
          PDF / JPEG / PNG (最大 5MB)
        </p>
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.profilePublic}
            onChange={(e) =>
              setForm({ ...form, profilePublic: e.target.checked })
            }
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            プロフィールを企業に公開する（スカウトを受け取るために必要です）
          </span>
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "保存中..." : "保存する"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/mypage")}
          className="text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          戻る
        </button>
      </div>
    </form>
  )
}
