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
  // 担当者アカウント同時発行（メール認証なし・即ログイン可）
  const [issueAccount, setIssueAccount] = useState(true)
  const [accountEmail, setAccountEmail] = useState("")
  const [accountPassword, setAccountPassword] = useState("")
  const [forceChange, setForceChange] = useState(false)
  // 発行結果（この画面でのみパスワードを表示する）
  const [issued, setIssued] = useState<{
    companyId: string
    companyName: string
    email: string
    password: string
  } | null>(null)

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

    if (issueAccount && accountEmail && !accountEmail.includes("@")) {
      setError("ログインIDはメールアドレス形式で入力してください（空欄なら自動生成）")
      return
    }
    if (issueAccount && accountPassword && accountPassword.length < 8) {
      setError("パスワードは 8 文字以上にしてください（空欄なら自動生成）")
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/admin/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          ...(issueAccount
            ? {
                account: {
                  ...(accountEmail ? { email: accountEmail } : {}),
                  ...(accountPassword ? { password: accountPassword } : {}),
                  mustChangePassword: forceChange,
                },
              }
            : {}),
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "登録に失敗しました")
        return
      }
      const newId = data?.company?.id
      if (data?.account?.password) {
        // ID/PASS はこの画面でのみ表示（リロードすると消える）
        setIssued({
          companyId: newId,
          companyName: data.company.name,
          email: data.account.email,
          password: data.account.password,
        })
        return
      }
      router.push(newId ? `/admin/companies/${newId}?created=1` : "/admin/companies")
      router.refresh()
    } catch {
      setError("登録中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  // 発行完了画面（パスワードはこの1回だけ表示）
  if (issued) {
    return (
      <div className="mx-auto max-w-xl">
        <h1 className="text-2xl font-bold text-gray-900">
          企業アカウントを発行しました
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {issued.companyName} は承認済みで、今すぐ求人を登録できます。
        </p>

        <div className="mt-6 border bg-white p-6 shadow-sm space-y-4">
          <div>
            <p className="text-xs font-bold text-gray-500">ログインURL</p>
            <p className="mt-0.5 select-all font-mono text-sm text-gray-900">
              https://www.genbacareer.jp/company/login
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500">ID（メールアドレス）</p>
            <p className="mt-0.5 select-all font-mono text-sm text-gray-900">
              {issued.email}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-500">パスワード</p>
            <p className="mt-0.5 select-all font-mono text-sm text-gray-900">
              {issued.password}
            </p>
          </div>
          <div className="border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            ⚠️ パスワードは<strong>この画面でしか表示されません</strong>
            。閉じる前に控えてください（再発行は企業詳細ページから可能）。
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href={`/admin/companies/${issued.companyId}`}
            className="bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
          >
            企業詳細へ
          </Link>
          <Link
            href="/company/login"
            target="_blank"
            className="border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            企業ログイン画面を開く（求人登録へ）
          </Link>
          <Link
            href="/admin/companies/new"
            className="border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => {
              setIssued(null)
              setForm(initialForm)
              setAccountEmail("")
              setAccountPassword("")
            }}
          >
            続けて別の企業を追加
          </Link>
        </div>
      </div>
    )
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

        {/* 担当者アカウント同時発行（代理掲載運用向け・メール認証なし） */}
        <div className="border-t pt-6">
          <label className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <input
              type="checkbox"
              checked={issueAccount}
              onChange={(e) => setIssueAccount(e.target.checked)}
              className="h-4 w-4 accent-primary-600"
            />
            ログイン用アカウント（ID/PASS）を同時に発行する
          </label>
          <p className="mt-1 text-xs text-gray-500">
            メール認証なしで即ログイン・求人登録できます（企業は承認済みとして作成されます）。
          </p>

          {issueAccount && (
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  ログインID（メールアドレス・空欄で自動生成）
                </label>
                <input
                  type="email"
                  value={accountEmail}
                  onChange={(e) => setAccountEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="空欄なら co-xxxxxxxx@agency.genbacareer.jp を自動生成"
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  実在の受信ボックスでなくても可（認証メールは送りません）。発行後は企業一覧からID/PASSを確認できます
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  パスワード（空欄で自動生成）
                </label>
                <input
                  type="text"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="8文字以上 / 空欄なら自動生成"
                  autoComplete="off"
                />
                <label className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={forceChange}
                    onChange={(e) => setForceChange(e.target.checked)}
                    className="h-3.5 w-3.5 accent-primary-600"
                  />
                  初回ログイン時にパスワード変更を必須にする（社外に渡す場合）
                </label>
              </div>
            </div>
          )}
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
