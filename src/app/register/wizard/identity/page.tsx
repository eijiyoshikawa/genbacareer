"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { StepShell } from "@/components/registration/step-shell"
import { WizardProgress } from "@/components/registration/wizard-progress"
import {
  loadAnswers,
  saveAnswers,
  clearAnswers,
} from "@/lib/registration/wizard-state"
import { getStepBySlug } from "@/lib/registration/steps"

export default function IdentityStepPage() {
  const router = useRouter()
  const step = getStepBySlug("identity")!

  const [last, setLast] = useState("")
  const [first, setFirst] = useState("")
  const [lastKana, setLastKana] = useState("")
  const [firstKana, setFirstKana] = useState("")
  const [phone, setPhone] = useState("")
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
  const isPhone = (s: string) => /^0\d{9,10}$/.test(s.replace(/-/g, ""))

  // 必須: 氏名 + カナ + 携帯番号
  const canProceed =
    last.trim() !== "" &&
    first.trim() !== "" &&
    isKana(lastKana) &&
    isKana(firstKana) &&
    isPhone(phone)

  const handleSubmit = async () => {
    setError("")
    setSubmitting(true)

    // ステートを保存
    saveAnswers({
      nameLast: last.trim(),
      nameFirst: first.trim(),
      nameLastKana: lastKana.trim(),
      nameFirstKana: firstKana.trim(),
      phone: phone.replace(/-/g, ""),
    })

    const answers = loadAnswers()
    const tmpPw = sessionStorage.getItem("genba-registration-tmp-pw")

    if (!answers.email || !tmpPw) {
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
          password: tmpPw,
          answers,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "登録に失敗しました。時間をおいてお試しください。")
        setSubmitting(false)
        return
      }

      // 成功 → セッション破棄 → 完了画面へ
      sessionStorage.removeItem("genba-registration-tmp-pw")
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
          {phone && !isPhone(phone) && (
            <p className="mt-1 text-[11px] text-rose-600">
              ハイフン無しの 10〜11 桁で入力してください (例: 09012345678)
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
