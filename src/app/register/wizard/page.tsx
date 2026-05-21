"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Mail, ArrowRight } from "lucide-react"
import { LineLoginButton } from "@/components/auth/line-login-button"
import { saveAnswers } from "@/lib/registration/wizard-state"

/**
 * ウィザード入口 (/register/wizard)。
 *
 * メアド + パスワードのみで開始 (8 ステップウィザードの Step 0 相当)。
 * 入力後 → sessionStorage に保存 → Step 1 (住まいエリア) に遷移。
 *
 * 既存の単一フォーム /register と並列で提供する新導線。
 * 既存ユーザーには影響しない (auth.ts の signIn は変更なし)。
 */
export default function WizardEntryPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  // セッションにメアドが残っていれば再開
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("genba-registration-wizard")
      if (raw) {
        const data = JSON.parse(raw)
        if (data.email) {
          // sessionStorage からの単発初期化は React 外の永続化反映のため effect で setState する
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setEmail(data.email)
        }
      }
    } catch {
      // 無視
    }
  }, [])

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email.includes("@")) {
      setError("メールアドレスを正しく入力してください")
      return
    }
    if (password.length < 8) {
      setError("パスワードは 8 文字以上で入力してください")
      return
    }
    if (!agreeTerms) {
      setError("利用規約・プライバシーポリシーへの同意が必要です")
      return
    }

    setPending(true)
    saveAnswers({ email })
    // パスワードは sessionStorage に書かず、完了時 API POST のフォームで再入力させる
    // (途中離脱→再開時のセキュリティ配慮)
    sessionStorage.setItem("genba-registration-tmp-pw", password)
    router.push("/register/wizard/address")
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:px-6 sm:py-14">
      <header className="text-center mb-6">
        <p className="text-xs font-bold text-primary-600 tracking-wide">
          無料・約 1 分で完了
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
          求職者 新規登録
        </h1>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          建設業界に特化した求人をあなただけにマッチング。
          <br />
          履歴書なし・LINE で気軽に応募できます。
        </p>
      </header>

      {/* LINE で 1 タップ登録 */}
      <LineLoginButton
        label="LINE で 1 タップ登録"
        callbackUrl="/mypage"
        fullWidth
      />

      <div className="my-4 flex items-center gap-2 text-xs text-gray-400">
        <span className="flex-1 border-t border-gray-200" />
        または メールアドレスで
        <span className="flex-1 border-t border-gray-200" />
      </div>

      <form onSubmit={handleStart} className="card-elevated bg-white p-5 sm:p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-bold text-gray-700">
            メールアドレス
          </label>
          <div className="mt-1 flex items-center gap-2 border border-gray-300 px-3 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 py-2.5 text-sm bg-transparent focus:outline-none"
              placeholder="example@mail.com"
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-bold text-gray-700">
            パスワード <span className="text-gray-400">(8 文字以上)</span>
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2.5 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="パスワードを入力"
          />
        </div>

        <label className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-primary-600"
          />
          <span>
            <Link href="/terms" target="_blank" className="text-primary-600 underline">
              利用規約
            </Link>{" "}
            と{" "}
            <Link href="/privacy" target="_blank" className="text-primary-600 underline">
              プライバシーポリシー
            </Link>{" "}
            に同意します
          </span>
        </label>

        <button
          type="submit"
          disabled={pending}
          className="press w-full inline-flex items-center justify-center gap-1.5 bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? "..." : "次へ進む"}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-gray-500">
        すでに登録済の方は{" "}
        <Link href="/login" className="text-primary-600 underline">
          ログイン
        </Link>
      </p>
      <p className="mt-2 text-center text-[11px] text-gray-400">
        企業の方は{" "}
        <Link href="/company/login" className="text-primary-600 underline">
          こちら
        </Link>
      </p>
    </div>
  )
}
