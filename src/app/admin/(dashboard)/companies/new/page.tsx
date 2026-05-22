"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { PREFECTURES } from "@/lib/constants"

const EMPLOYEE_COUNT_OPTIONS = [
  "1-10",
  "11-50",
  "51-100",
  "101-300",
  "301-500",
  "501-1000",
  "1001-5000",
  "5001+",
]

type FormState = {
  name: string
  industry: string
  prefecture: string
  city: string
  address: string
  employeeCount: string
  description: string
  logoUrl: string
  websiteUrl: string
  contactEmail: string
}

const initialForm: FormState = {
  name: "",
  industry: "",
  prefecture: "",
  city: "",
  address: "",
  employeeCount: "",
  description: "",
  logoUrl: "",
  websiteUrl: "",
  contactEmail: "",
}

export default function AdminCompanyNewPage() {
  const router = useRouter()
  const [form, setForm] = useState<FormState>(initialForm)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const update = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!form.name.trim()) {
      setError("会社名は必須です")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "登録に失敗しました")
        return
      }
      // 作成直後にそのまま「ログイン情報を発行」UI に到達できるよう詳細へ遷移
      const newId = data?.company?.id
      router.push(newId ? `/admin/companies/${newId}?created=1` : "/admin/companies")
      router.refresh()
    } catch {
      setError("登録中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">企業を追加</h1>
        <Link
          href="/admin/companies"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← 一覧に戻る
        </Link>
      </div>
      <p className="mt-1 text-sm text-gray-500">
        新しい企業情報を手動で登録します。必須項目は会社名のみです。
      </p>

      {error && (
        <div className="mt-4 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6 border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="株式会社サンプル"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              業種
            </label>
            <input
              type="text"
              value={form.industry}
              onChange={(e) => update("industry", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="建設業 / 運送業 / 製造業 など"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              従業員数
            </label>
            <select
              value={form.employeeCount}
              onChange={(e) => update("employeeCount", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">選択してください</option>
              {EMPLOYEE_COUNT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} 名
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              都道府県
            </label>
            <select
              value={form.prefecture}
              onChange={(e) => update("prefecture", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
              onChange={(e) => update("city", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="新宿区"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            住所
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="東京都新宿区西新宿1-1-1 サンプルビル5F"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            会社概要
          </label>
          <textarea
            rows={5}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="創業30年の安定企業。関東エリアを中心に〜"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              ロゴ画像 URL
            </label>
            <input
              type="url"
              value={form.logoUrl}
              onChange={(e) => update("logoUrl", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="https://example.com/logo.png"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Web サイト URL
            </label>
            <input
              type="url"
              value={form.websiteUrl}
              onChange={(e) => update("websiteUrl", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            担当者メールアドレス
          </label>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => update("contactEmail", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="recruit@example.com"
          />
        </div>

        <div className="flex justify-end gap-3 border-t pt-6">
          <Link
            href="/admin/companies"
            className="border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "登録中..." : "登録する"}
          </button>
        </div>
      </form>
    </div>
  )
}
