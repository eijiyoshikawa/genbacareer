"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Shield, Loader2, Users, ArrowRight } from "lucide-react";

/**
 * 企業向けログインページ。
 *
 * 求職者ログインは /login にある。
 * 企業アカウントは TOTP (2FA) 有効化に対応するため 2 段階フォームを持つ。
 */
export default function CompanyLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [totpRequired, setTotpRequired] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function resetTotpState() {
    setTotpRequired(false);
    setTotp("");
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("company-credentials", {
        email,
        password,
        totp: totp || undefined,
        redirect: false,
      });

      if (result?.error) {
        // 2FA が有効な企業アカウントは code="totp_required" を返す
        // (Auth.js v5 は authorize 内の Error をラップして result.error を
        // 汎用文字列にしてしまうため、判定には result.code を使う)
        if (result.code === "totp_required") {
          setTotpRequired(true);
          setError("認証アプリの 6 桁コード（またはリカバリコード）を入力してください。");
          return;
        }
        if (result.code === "totp_invalid") {
          setError("認証コードが正しくありません。もう一度お試しください。");
          return;
        }
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else if (result?.ok) {
        window.location.href = "/company/dashboard";
      }
    } catch {
      setError("ログイン中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white p-8 shadow-lg">
          <h1 className="mb-1 text-center text-2xl font-bold text-gray-900">
            企業ログイン
          </h1>
          <p className="mb-6 text-center text-xs text-gray-500">
            求人掲載・応募管理・カレンダー連携にご利用いただけます
          </p>

          {error && (
            <div className="mb-4 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {totpRequired ? (
            /* === 2 段目: TOTP コード入力 === */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                <Shield className="h-4 w-4 shrink-0" />
                <span>
                  この企業アカウントは 2 段階認証が有効です。認証アプリの 6 桁コード（または 8 桁ハイフン付きのリカバリコード）を入力してください。
                </span>
              </div>
              <div>
                <label htmlFor="totp" className="block text-sm font-medium text-gray-700">
                  認証コード
                </label>
                <input
                  id="totp"
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  autoFocus
                  required
                  value={totp}
                  onChange={(e) => setTotp(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 px-3 py-2 text-lg tracking-widest font-mono text-center focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="000000"
                  maxLength={20}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={loading || totp.length < 6}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Shield className="h-4 w-4" />
                  )}
                  確認してログイン
                </button>
                <button
                  type="button"
                  onClick={resetTotpState}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  戻る
                </button>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                認証アプリを失った場合は、保存してあるリカバリコード（例:
                <code className="mx-0.5 bg-gray-100 px-1 font-mono">ABCD-1234-AB</code>）
                をそのまま入力してください。1 回限り消費されます。
              </p>
            </form>
          ) : (
            /* === 1 段目: メール + パスワード === */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  メールアドレス
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="example@company.jp"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  パスワード
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="パスワードを入力"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </button>
            </form>
          )}

          {!totpRequired && (
            <div className="mt-4 text-center text-sm text-gray-500">
              企業アカウントをお持ちでない方は
              <Link
                href="/company/register"
                className="ml-1 font-medium text-primary-600 hover:text-primary-500"
              >
                新規登録
              </Link>
            </div>
          )}
        </div>

        {/* 求職者の方はこちら */}
        <Link
          href="/login"
          className="press group mt-4 flex items-center justify-between border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-primary-300 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-primary-50">
              <Users className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                求職者の方はこちら
              </p>
              <p className="text-[11px] text-gray-500">
                求人検索 / 応募管理 / お祝い金申請
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition" />
        </Link>
      </div>
    </div>
  );
}
