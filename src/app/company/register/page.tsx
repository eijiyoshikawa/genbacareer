"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PREFECTURES } from "@/lib/constants";

export default function CompanyRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    companyName: "",
    industry: "",
    prefecture: "",
    contactEmail: "",
    password: "",
    passwordConfirm: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = (): string | null => {
    if (!form.companyName.trim()) return "会社名を入力してください。";
    if (!form.industry) return "業種を選択してください。";
    if (!form.prefecture) return "都道府県を選択してください。";
    if (!form.contactEmail.trim())
      return "担当者メールアドレスを入力してください。";
    if (form.password.length < 8)
      return "パスワードは8文字以上で入力してください。";
    if (form.password !== form.passwordConfirm)
      return "パスワードが一致しません。";
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
      const res = await fetch("/api/company/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName,
          industry: form.industry,
          prefecture: form.prefecture,
          contactEmail: form.contactEmail,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "登録に失敗しました。");
        return;
      }

      router.push("/login?registered=company-pending");
    } catch {
      setError("登録中にエラーが発生しました。もう一度お試しください。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className=" bg-white p-8 shadow-lg">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-900">
            企業 新規登録
          </h1>

          {error && (
            <div className="mb-4  bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="companyName"
                className="block text-sm font-medium text-gray-700"
              >
                会社名 <span className="text-red-500">*</span>
              </label>
              <input
                id="companyName"
                type="text"
                required
                value={form.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="株式会社○○建設"
              />
            </div>

            <div>
              <label
                htmlFor="industry"
                className="block text-sm font-medium text-gray-700"
              >
                業種 <span className="text-red-500">*</span>
              </label>
              <select
                id="industry"
                required
                value={form.industry}
                onChange={(e) => updateField("industry", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">選択してください</option>
                <option value="総合建設（ゼネコン）">総合建設（ゼネコン）</option>
                <option value="建築工事">建築工事</option>
                <option value="土木工事">土木工事</option>
                <option value="電気設備工事">電気設備工事</option>
                <option value="管工事・空調設備">管工事・空調設備</option>
                <option value="内装仕上工事">内装仕上工事</option>
                <option value="塗装工事">塗装工事</option>
                <option value="防水工事">防水工事</option>
                <option value="解体工事">解体工事</option>
                <option value="舗装工事">舗装工事</option>
                <option value="とび・土工工事">とび・土工工事</option>
                <option value="鉄骨・鉄筋工事">鉄骨・鉄筋工事</option>
                <option value="産業廃棄物処理">産業廃棄物処理</option>
                <option value="測量・設計">測量・設計</option>
                <option value="不動産・デベロッパー">不動産・デベロッパー</option>
                <option value="建設機械レンタル">建設機械レンタル</option>
                <option value="その他建設関連">その他建設関連</option>
              </select>
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
                htmlFor="contactEmail"
                className="block text-sm font-medium text-gray-700"
              >
                担当者メールアドレス <span className="text-red-500">*</span>
              </label>
              <input
                id="contactEmail"
                type="email"
                required
                value={form.contactEmail}
                onChange={(e) => updateField("contactEmail", e.target.value)}
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="tantosha@example.com"
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
                onChange={(e) =>
                  updateField("passwordConfirm", e.target.value)
                }
                className="mt-1 block w-full  border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                placeholder="もう一度入力"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full  bg-green-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "登録中..." : "登録する"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            すでにアカウントをお持ちの方は
            <Link
              href="/company/login"
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
