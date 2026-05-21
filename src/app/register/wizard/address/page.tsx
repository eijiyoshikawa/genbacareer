"use client"

import { useEffect, useState } from "react"
import { StepShell } from "@/components/registration/step-shell"
import { WizardProgress } from "@/components/registration/wizard-progress"
import { RegionBlockPicker } from "@/components/registration/region-block-picker"
import { loadAnswers, saveAnswers } from "@/lib/registration/wizard-state"
import { getStepBySlug } from "@/lib/registration/steps"

export default function AddressStepPage() {
  const step = getStepBySlug("address")!
  const [prefSlug, setPrefSlug] = useState<string | undefined>()
  const [prefLabel, setPrefLabel] = useState<string | undefined>()
  const [city, setCity] = useState("")

  useEffect(() => {
    const a = loadAnswers()
    if (a.prefecture) {
      setPrefLabel(a.prefecture)
      import("@/lib/prefectures").then(({ PREFECTURE_LABEL_TO_SLUG }) => {
        setPrefSlug(PREFECTURE_LABEL_TO_SLUG[a.prefecture!])
      })
    }
    if (a.city) setCity(a.city)
  }, [])

  const handleSelectPref = (slug: string, label: string) => {
    setPrefSlug(slug)
    setPrefLabel(label)
  }

  const handleNext = () => {
    if (prefLabel) {
      saveAnswers({ prefecture: prefLabel, city: city.trim() || undefined })
    }
  }

  const canProceed = !!prefLabel

  return (
    <>
      <WizardProgress currentStep={step.id} />
      <StepShell
        title={step.title}
        description={step.description}
        required={step.required}
        canProceed={canProceed}
        onNext={handleNext}
        nextHref="/register/wizard/experience"
        prevHref="/register/wizard"
      >
        <RegionBlockPicker
          selectedPrefSlug={prefSlug}
          onSelect={handleSelectPref}
        />

        {/* 市区町村は任意の自由記入 */}
        {prefLabel && (
          <div className="mt-6 border-t pt-4">
            <label htmlFor="city" className="block text-xs font-bold text-gray-700">
              市区町村{" "}
              <span className="ml-1 text-[10px] font-normal text-gray-400">
                (任意・あとで編集できます)
              </span>
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="例) 大阪市中央区"
              className="mt-1.5 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        )}
      </StepShell>
    </>
  )
}
