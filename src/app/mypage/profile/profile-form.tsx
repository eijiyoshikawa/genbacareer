"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PREFECTURES } from "@/lib/constants"
import { CATEGORIES } from "@/lib/categories"
import { JOB_SEARCH_STATUSES } from "@/lib/job-search-status"
import { PostalCodeInput } from "@/components/forms/postal-code-input"

// 希望月収（下限）の選択肢: 20万〜50万円・5万円刻み
const SALARY_MIN_OPTIONS = [
  200_000, 250_000, 300_000, 350_000, 400_000, 450_000, 500_000,
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
  jobSearchStatus: string
}

export function ProfileForm({ initialData }: { initialData: ProfileFormData }) {
  const router = useRouter()
  const [form, setForm] = useState(initialData)
  // 郵便番号は住所自動入力の補助用。User スキーマには保存しないためローカル state。
  const [postalCode, setPostalCode] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

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
          jobSearchStatus: form.jobSearchStatus,
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
        <div className="bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 p-4 text-sm text-green-600">
          プロフィールを更新しました
        </div>
      )}

      <div className="border bg-white p-6 shadow-sm space-y-5">
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
            className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm focus:border-primary-500 focus:ring-primary-500"
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
            className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
            placeholder="090-1234-5678"
          />
        </div>

        <PostalCodeInput
          value={postalCode}
          onValueChange={setPostalCode}
          onResolved={(addr) =>
            setForm((prev) => ({
              ...prev,
              prefecture: addr.prefecture,
              city: `${addr.city}${addr.town}`,
            }))
          }
        />

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
              maxLength={50}
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
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
            className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
          />
        </div>
      </div>

      <div className="border bg-white p-6 shadow-sm space-y-5">
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
                className={` px-3 py-1 text-sm font-medium transition ${
                  form.desiredCategories.includes(c.value)
                    ? "bg-primary-600 text-white"
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
            希望月収（下限）
          </label>
          <select
            value={form.desiredSalaryMin}
            onChange={(e) =>
              setForm({ ...form, desiredSalaryMin: e.target.value })
            }
            className="mt-1 block w-full border bg-white px-3 py-2 text-sm shadow-sm"
          >
            <option value="">指定なし</option>
            {/* 20万〜50万円・5万円刻み */}
            {SALARY_MIN_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v / 10000}万円以上
              </option>
            ))}
            {/* 旧フォーム(自由入力)で保存済みの値が刻みに無い場合も表示を保つ */}
            {form.desiredSalaryMin &&
              !SALARY_MIN_OPTIONS.includes(Number(form.desiredSalaryMin)) && (
                <option value={form.desiredSalaryMin}>
                  {Number(form.desiredSalaryMin).toLocaleString()}円以上（現在の設定）
                </option>
              )}
          </select>
        </div>
      </div>

      <div className="border bg-white p-6 shadow-sm space-y-5">
        <h2 className="text-lg font-semibold text-gray-900">求職ステータス</h2>
        <p className="text-xs text-gray-500">
          現在の状況に応じて、新着求人通知や企業からの連絡量が変わります。
        </p>
        <div className="space-y-2">
          {JOB_SEARCH_STATUSES.map((s) => (
            <label
              key={s.value}
              className="flex cursor-pointer items-start gap-3 border p-3 hover:bg-gray-50"
            >
              <input
                type="radio"
                name="jobSearchStatus"
                value={s.value}
                checked={form.jobSearchStatus === s.value}
                onChange={(e) =>
                  setForm({ ...form, jobSearchStatus: e.target.value })
                }
                className="mt-1 h-4 w-4 border-gray-300 text-primary-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900">{s.label}</p>
                <p className="text-xs text-gray-500">{s.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="border bg-white p-6 shadow-sm">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.profilePublic}
            onChange={(e) =>
              setForm({ ...form, profilePublic: e.target.checked })
            }
            className="h-4 w-4 border-gray-300 text-primary-600"
          />
          <span className="text-sm text-gray-700">
            プロフィールを企業に公開する
          </span>
        </label>
        {!form.profilePublic && (
          <div className="mt-1 flex items-start gap-2 border border-amber-300 bg-amber-50 p-3">
            <span aria-hidden className="text-base leading-none">⚠️</span>
            <p className="text-xs leading-relaxed text-amber-900">
              <span className="font-bold">
                公開をオフにすると、企業からのスカウトが届かなくなります。
              </span>
              <br />
              スカウト機能のリリース後も、あなたの経験にマッチした好条件のオファーを受け取れません。特別な理由がなければ公開のままをおすすめします。
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
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
