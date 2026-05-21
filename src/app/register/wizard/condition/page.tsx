"use client"

import { useEffect, useState } from "react"
import { StepShell } from "@/components/registration/step-shell"
import { WizardProgress } from "@/components/registration/wizard-progress"
import { loadAnswers, saveAnswers } from "@/lib/registration/wizard-state"
import { getStepBySlug } from "@/lib/registration/steps"
import { PREFECTURES_LIST } from "@/lib/prefectures"

const SALARY_RANGES: Array<{ value: number; label: string }> = [
  { value: 200000, label: "月給 20 万円〜" },
  { value: 250000, label: "月給 25 万円〜" },
  { value: 300000, label: "月給 30 万円〜" },
  { value: 350000, label: "月給 35 万円〜" },
  { value: 400000, label: "月給 40 万円〜" },
  { value: 500000, label: "月給 50 万円〜" },
]

const TRANSFER_TIMING: Array<{ value: string; label: string }> = [
  { value: "asap", label: "すぐにでも" },
  { value: "3months", label: "3 ヶ月以内" },
  { value: "6months", label: "半年以内" },
  { value: "1year", label: "1 年以内" },
  { value: "undecided", label: "良い求人があれば" },
]

const MAX_DESIRED_PREFS = 5

export default function ConditionStepPage() {
  const step = getStepBySlug("condition")!
  const [desiredPrefs, setDesiredPrefs] = useState<string[]>([])
  const [salary, setSalary] = useState<number | null>(null)
  const [timing, setTiming] = useState<string>("")

  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage 初期化 */
  useEffect(() => {
    const a = loadAnswers()
    if (a.desiredPrefectures) setDesiredPrefs(a.desiredPrefectures)
    if (a.desiredSalaryMin) setSalary(a.desiredSalaryMin)
    if (a.desiredTransferTiming) setTiming(a.desiredTransferTiming)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const togglePref = (label: string) => {
    if (desiredPrefs.includes(label)) {
      setDesiredPrefs(desiredPrefs.filter((p) => p !== label))
    } else if (desiredPrefs.length < MAX_DESIRED_PREFS) {
      setDesiredPrefs([...desiredPrefs, label])
    }
  }

  const handleNext = () => {
    saveAnswers({
      desiredPrefectures: desiredPrefs,
      desiredSalaryMin: salary ?? undefined,
      desiredTransferTiming: timing,
    })
  }

  // 必須: 希望勤務地 1 以上 + 年収 + 転職時期
  const canProceed = desiredPrefs.length > 0 && salary !== null && timing !== ""

  return (
    <>
      <WizardProgress currentStep={step.id} />
      <StepShell
        title={step.title}
        description={step.description}
        required={step.required}
        canProceed={canProceed}
        onNext={handleNext}
        nextHref="/register/wizard/identity"
        prevHref="/register/wizard/experience"
      >
        {/* 希望勤務地 */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">
            希望する勤務地{" "}
            <span className="text-rose-600">*</span>
            <span className="ml-2 text-[10px] font-normal text-gray-500">
              最大 {MAX_DESIRED_PREFS} 件 ({desiredPrefs.length}/{MAX_DESIRED_PREFS})
            </span>
          </p>
          <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-64 overflow-y-auto p-1 border border-gray-200">
            {PREFECTURES_LIST.map((p) => {
              const sel = desiredPrefs.includes(p.label)
              const disabled = !sel && desiredPrefs.length >= MAX_DESIRED_PREFS
              return (
                <button
                  key={p.slug}
                  type="button"
                  onClick={() => togglePref(p.label)}
                  disabled={disabled}
                  className={`press text-xs font-bold py-2 transition ${
                    sel
                      ? "bg-primary-600 text-white"
                      : disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-white text-gray-800 border border-gray-200 hover:border-primary-400"
                  }`}
                >
                  {p.label.replace(/[県府都道]$/, "")}
                </button>
              )
            })}
          </div>
        </div>

        {/* 希望年収 */}
        <div className="mt-6">
          <p className="text-xs font-bold text-gray-700 mb-2">
            希望の最低年収 <span className="text-rose-600">*</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {SALARY_RANGES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSalary(s.value)}
                className={`press py-2.5 text-sm font-bold border transition ${
                  salary === s.value
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-800 border-gray-200 hover:border-primary-400"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 希望転職時期 */}
        <div className="mt-6">
          <p className="text-xs font-bold text-gray-700 mb-2">
            希望転職時期 <span className="text-rose-600">*</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {TRANSFER_TIMING.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTiming(t.value)}
                className={`press py-2.5 text-sm font-bold border transition ${
                  timing === t.value
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-800 border-gray-200 hover:border-primary-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </StepShell>
    </>
  )
}
