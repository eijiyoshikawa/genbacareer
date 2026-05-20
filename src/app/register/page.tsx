"use client";

import { useState } from "react";
import Link from "next/link";
import { PREFECTURES } from "@/lib/constants";
import { LineLoginButton } from "@/components/auth/line-login-button";

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    passwordConfirm: "",
    prefecture: "",
    birthDate: "",
  });
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  function isAtLeast18(birthDate: string): boolean {
    if (!birthDate) return false;
    const d = new Date(birthDate);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    const eighteenYearsAgo = new Date(
      now.getFullYear() - 18,
      now.getMonth(),
      now.getDate()
    );
    return d.getTime() <= eighteenYearsAgo.getTime();
  }

  const validate = (): string | null => {
    if (!form.name.trim()) return "氏名を入力してください。";
    if (!form.email.trim()) return "メールアドレスを入力してください。";
    if (form.password.length < 8)
      return "パスワードは8文字以上で入力してください。";
    if (form.password !== form.passwordConfirm)
      return "パスワードが一致しません。";
    if (!form.prefecture) return "都道府県を選択してください。";
    if (!form.birthDate) return "生年月日を入力してください。";
    if (!isAtLeast18(form.birthDate))
      return "ご利用は18歳以上の方に限らせていただいております。";
    if (!agreeTerms)
      return "利用規約とプライバシーポリシーへの同意が必要です。";
    if (!agreeAge)
      return "18歳以上であることの確認にチェックを入れてください。";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          prefecture: form.prefecture,
          birthDate: form.birthDate,
          termsAccepted: agreeTerms && agreeAge,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登録に失敗しました。");
        return;
      }

      setSubmittedEmail(form.email);
    } catch {
      setError("登録中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white p-8 shadow-lg text-center">
          <h1 className="mb-3 text-2xl font-bold text-gray-900">
            登録ありがとうございます
          </h1>
          <p className="text-sm text-gray-700">
            <strong>{submittedEmail}</strong> 宛に確認メールを送信しました。
          </p>
          <p className="mt-3 text-sm text-gray-600">
            メール内のリンクをクリックして確認を完了してください。確認が完了するまでは求人への応募ができません。
          </p>
          <p className="mt-4 text-xs text-gray-500">
            メールが届かない場合は迷惑メールフォルダもご確認ください（リンクの有効期限は24時間です）。
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            ログインへ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className=" bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
            求職者 新規登録
          </h1>

          {error && (
            <div className="mb-4  bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* === LINE 1 タップ登録 (主導線) === */}
          <LineLoginButton label="LINE で 1 タップ登録" callbackUrl="/mypage" fullWidth />
          <p className="mt-1.5 text-[11px] text-center text-gray-500">
            生年月日 / 都道府県は登録後に補完できます (18 歳以上の方限定)
          </p>

          <div className="my-4 flex items-center gap-2 text-xs text-gray-400">
            <span className="flex-1 border-t border-gray-200" />
            または メールアドレスで登録
            <span className="flex-1 border-t border-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                氏名 <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                required
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="山田 太郎"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="example@mail.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード <span className="text-red-500">*</span>
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => updateField("password", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="8文字以上"
              />
            </div>

            <div>
              <label
                htmlFor="passwordConfirm"
                className="block text-sm font-medium text-gray-700"
              >
                パスワード（確認） <span className="text-red-500">*</span>
              </label>
              <input
                id="passwordConfirm"
                type="password"
                required
                minLength={8}
                value={form.passwordConfirm}
                onChange={(e) => updateField("passwordConfirm", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="もう一度入力"
              />
            </div>

            <div>
              <label
                htmlFor="prefecture"
                className="block text-sm font-medium text-gray-700"
              >
                都道府県 <span className="text-red-500">*</span>
              </label>
              <select
                id="prefecture"
                required
                value={form.prefecture}
                onChange={(e) => updateField("prefecture", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                {PREFECTURES.map((pref) => (
                  <option key={pref} value={pref}>
                    {pref}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="birthDate"
                className="block text-sm font-medium text-gray-700"
              >
                生年月日 <span className="text-red-500">*</span>
              </label>
              <input
                id="birthDate"
                type="date"
                required
                value={form.birthDate}
                onChange={(e) => updateField("birthDate", e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                className="mt-1 block w-full border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                18 歳未満の方はご登録いただけません。
              </p>
            </div>

            <div className="space-y-2 border-t border-gray-200 pt-4">
              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={agreeAge}
                  onChange={(e) => setAgreeAge(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  私は 18 歳以上であることを確認します。
                  <span className="text-red-500">*</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
                <span>
                  <Link
                    href="/terms"
                    target="_blank"
                    className="text-primary-600 underline hover:text-primary-700"
                  >
                    利用規約
                  </Link>
                  と
                  <Link
                    href="/privacy"
                    target="_blank"
                    className="ml-1 text-primary-600 underline hover:text-primary-700"
                  >
                    プライバシーポリシー
                  </Link>
                  に同意します。
                  <span className="text-red-500">*</span>
                </span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full  bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "登録中..." : "登録する"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            すでにアカウントをお持ちの方は
            <Link
              href="/login"
              className="ml-1 font-medium text-primary-600 hover:text-primary-500"
            >
              ログイン
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
