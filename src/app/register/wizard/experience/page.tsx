"use client"

import { useEffect, useState } from "react"
import { StepShell } from "@/components/registration/step-shell"
import { WizardProgress } from "@/components/registration/wizard-progress"
import { ConstructionJobPicker } from "@/components/registration/construction-job-picker"
import {
  EXPERIENCE_YEARS,
  COMPANY_COUNT_OPTIONS,
  findCategoryBySubcategory,
} from "@/lib/registration/construction-jobs"
import { loadAnswers, saveAnswers } from "@/lib/registration/wizard-state"
import { getStepBySlug } from "@/lib/registration/steps"

export default function ExperienceStepPage() {
  const step = getStepBySlug("experience")!
  const [subcategories, setSubcategories] = useState<string[]>([])
  const [years, setYears] = useState<string>("")
  const [companyCount, setCompanyCount] = useState<string>("")

  /* eslint-disable react-hooks/set-state-in-effect -- sessionStorage 初期化 */
  useEffect(() => {
    const a = loadAnswers()
    if (a.experiencedSubcategories) setSubcategories(a.experiencedSubcategories)
    if (a.experienceYears) setYears(a.experienceYears)
    if (a.companyCount) setCompanyCount(a.companyCount)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleNext = () => {
    const categories: string[] = []
    for (const s of subcategories) {
      const c = findCategoryBySubcategory(s)
      if (c && !categories.includes(c)) categories.push(c)
    }
    saveAnswers({
      experiencedSubcategories: subcategories,
      experiencedCategories: categories,
      experienceYears: years,
      companyCount: companyCount,
    })
  }

  // 必須: 職種 1 つ以上 + 経験年数 + 経験社数
  const canProceed =
    subcategories.length > 0 && years.length > 0 && companyCount.length > 0

  return (
    <>
      <WizardProgress currentStep={step.id} />
      <StepShell
        title={step.title}
        description={step.description}
        required={step.required}
        canProceed={canProceed}
        onNext={handleNext}
        nextHref="/register/wizard/condition"
        prevHref="/register/wizard/address"
      >
        {/* 経験職種 (複数選択) */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">
            経験のある職種{" "}
            <span className="text-rose-600">*</span>
            <span className="ml-2 text-[10px] font-normal text-gray-500">
              複数選択可
            </span>
          </p>
          <ConstructionJobPicker
            selectedSubcategories={subcategories}
            onChange={setSubcategories}
          />
        </div>

        {/* 経験年数 */}
        <div className="mt-6">
          <p className="text-xs font-bold text-gray-700 mb-2">
            建設業の経験年数 <span className="text-rose-600">*</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {EXPERIENCE_YEARS.map((y) => (
              <button
                key={y.value}
                type="button"
                onClick={() => setYears(y.value)}
                className={`press py-2.5 text-sm font-bold border transition ${
                  years === y.value
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-800 border-gray-200 hover:border-primary-400"
                }`}
              >
                {y.label}
              </button>
            ))}
          </div>
        </div>

        {/* 経験社数 */}
        <div className="mt-6">
          <p className="text-xs font-bold text-gray-700 mb-2">
            これまでの転職回数 <span className="text-rose-600">*</span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {COMPANY_COUNT_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCompanyCount(c.value)}
                className={`press py-2.5 text-sm font-bold border transition ${
                  companyCount === c.value
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-800 border-gray-200 hover:border-primary-400"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </StepShell>
    </>
  )
}
