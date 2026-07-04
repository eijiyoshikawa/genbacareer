"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { StepShell } from "@/components/registration/step-shell"
import { WizardProgress } from "@/components/registration/wizard-progress"
import {
  loadAnswers,
  saveAnswers,
  clearAnswers,
} from "@/lib/registration/wizard-state"
import { getStepBySlug } from "@/lib/registration/steps"
import { normalizePhone, isMobilePhone } from "@/lib/registration/phone"

export default function IdentityStepPage() {
  const router = useRouter()
  const step = getStepBySlug("identity")!

  const [last, setLast] = useState("")
  const [first, setFirst] = useState("")
  const [lastKana, setLastKana] = useState("")
  const [firstKana, setFirstKana] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage 初期化 */
  useEffect(() => {
    const a = loadAnswers()
    if (a.nameLast) setLast(a.nameLast)
    if (a.nameFirst) setFirst(a.nameFirst)
    if (a.nameLastKana) setLastKana(a.nameLastKana)
    if (a.nameFirstKana) setFirstKana(a.nameFirstKana)
    if (a.phone) setPhone(a.phone)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const isKana = (s: string) => /^[ァ-ヶー぀-ゟ]+$/.test(s)

  // 必須: 氏名 + カナ + 携帯番号 + パスワード
  const canProceed =
    last.trim() !== "" &&
    first.trim() !== "" &&
    isKana(lastKana) &&
    isKana(firstKana) &&
    isMobilePhone(phone) &&
    password.length >= 8

  const handleSubmit = async () => {
    setError("")
    setSubmitting(true)

    const normalizedPhone = normalizePhone(phone)

    saveAnswers({
      nameLast: last.trim(),
      nameFirst: first.trim(),
      nameLastKana: lastKana.trim(),
      nameFirstKana: firstKana.trim(),
      phone: normalizedPhone,
    })

    const answers = loadAnswers()

    if (!answers.email) {
      setError(
        "セッションが切れています。お手数ですが最初からやり直してください。",
      )
      setSubmitting(false)
      router.push("/register/wizard")
      return
    }

    try {
      const res = await fetch("/api/registration/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: answers.email,
          password,
          answers: { ...answers, phone: normalizedPhone },
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました。時間をおいてお試しください。")
        setSubmitting(false)
        return
      }

      // 成功 → 完了画面は「そのまま応募できます」と案内するため、ここで即ログインさせる
      // (これが無いと done 画面の「マイページへ」が /login に弾かれてしまう)。
      // ログイン自体に失敗しても登録は成立しているので、完了画面へは進める。
      await signIn("seeker-credentials", {
        email: answers.email,
        password,
        redirect: false,
      }).catch(() => null)

      clearAnswers()
      router.push("/register/wizard/done")
    } catch {
      setError("通信エラーが発生しました。時間をおいてお試しください。")
      setSubmitting(false)
    }
  }

  return (
    <>
      <WizardProgress currentStep={step.id} />
      <StepShell
        title={step.title}
        description={step.description}
        required={step.required}
        canProceed={canProceed && !submitting}
        onNext={handleSubmit}
        nextLabel="登録する"
        prevHref="/register/wizard/condition"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 text-xs text-red-700 mb-4">
            {error}
          </div>
        )}

        {/* 氏名 */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            氏名 <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="姓 (例: 山田)"
              value={last}
              onChange={(e) => setLast(e.target.value)}
              autoComplete="family-name"
              className="border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <input
              type="text"
              placeholder="名 (例: 太郎)"
              value={first}
              onChange={(e) => setFirst(e.target.value)}
              autoComplete="given-name"
              className="border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* カナ */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            氏名 (カナ) <span className="text-rose-600">*</span>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="セイ (例: ヤマダ)"
              value={lastKana}
              onChange={(e) => setLastKana(e.target.value)}
              className="border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <input
              type="text"
              placeholder="メイ (例: タロウ)"
              value={firstKana}
              onChange={(e) => setFirstKana(e.target.value)}
              className="border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          {(lastKana || firstKana) && !(isKana(lastKana) && isKana(firstKana)) && (
            <p className="mt-1 text-[11px] text-rose-600">
              カタカナ または ひらがなで入力してください
            </p>
          )}
        </div>

        {/* 携帯番号 */}
        <div className="mt-4">
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            携帯番号 <span className="text-rose-600">*</span>
            <span className="ml-2 text-[10px] font-normal text-gray-500">
              企業からの面接調整に使われます
            </span>
          </label>
          <input
            type="tel"
            inputMode="tel"
            placeholder="09012345678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            className="block w-full border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          {phone && !isMobilePhone(phone) && (
            <p className="mt-1 text-[11px] text-rose-600">
              携帯番号 (070 / 080 / 090) を入力してください
            </p>
          )}
        </div>

        {/* パスワード */}
        <div className="mt-4">
          <label htmlFor="wizard-password" className="block text-xs font-bold text-gray-700 mb-1.5">
            パスワード <span className="text-rose-600">*</span>
            <span className="ml-2 text-[10px] font-normal text-gray-500">
              8 文字以上
            </span>
          </label>
          <input
            id="wizard-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="block w-full border border-gray-300 px-3 py-2.5 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="パスワードを入力"
          />
          {password.length > 0 && password.length < 8 && (
            <p className="mt-1 text-[11px] text-rose-600">
              8 文字以上で入力してください
            </p>
          )}
        </div>

        <p className="mt-6 text-[11px] text-gray-500 text-center">
          「登録する」を押すと利用規約・プライバシーポリシーに同意したものとみなされます
        </p>
      </StepShell>
    </>
  )
}
