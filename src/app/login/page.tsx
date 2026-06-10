"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Building2, ArrowRight } from "lucide-react";
import { LineLoginButton } from "@/components/auth/line-login-button";
import { PasswordInput } from "@/components/auth/password-input";

/**
 * 求職者向けログインページ。
 *
 * 企業ログインは /company/login に分離してある。
 * 企業の方は本ページ下部の「企業の方はこちら」リンクから遷移する。
 */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("seeker-credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("メールアドレスまたはパスワードが正しくありません。");
      } else if (result?.ok) {
        window.location.href = "/mypage";
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
            求職者ログイン
          </h1>
          <p className="mb-6 text-center text-xs text-gray-500">
            お気に入り・応募管理・お祝い金申請にご利用いただけます
          </p>

          {error && (
            <div className="mb-4 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* === LINE 1 タップログイン (主導線) === */}
          <LineLoginButton label="LINE でログイン" callbackUrl="/mypage" fullWidth />

          <div className="my-4 flex items-center gap-2 text-xs text-gray-400">
            <span className="flex-1 border-t border-gray-200" />
            または メールアドレスで
            <span className="flex-1 border-t border-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                メールアドレス
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="example@mail.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード
              </label>
              <PasswordInput
                id="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          <div className="mt-4 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              パスワードをお忘れの方
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            アカウントをお持ちでない方は
            <Link
              href="/register"
              className="ml-1 font-medium text-primary-600 hover:text-primary-500"
            >
              新規登録
            </Link>
          </div>
        </div>

        {/* 企業の方はこちら — 視覚的に明確に分離 */}
        <Link
          href="/company/login"
          className="press group mt-4 flex items-center justify-between border border-gray-200 bg-white px-5 py-4 shadow-sm hover:border-primary-300 hover:shadow-md transition"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-primary-50">
              <Building2 className="h-5 w-5 text-primary-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">
                企業の方はこちら
              </p>
              <p className="text-[11px] text-gray-500">
                求人掲載 / 応募管理 / 企業アカウント
              </p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-primary-600 transition" />
        </Link>
      </div>
    </div>
  );
}
