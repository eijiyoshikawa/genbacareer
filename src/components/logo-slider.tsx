"use client"

import { Building2 } from "lucide-react"

const COMPANIES = [
  "鹿島建設",
  "清水建設",
  "大林組",
  "竹中工務店",
  "大成建設",
  "前田建設工業",
  "戸田建設",
  "五洋建設",
  "奥村組",
  "熊谷組",
  "西松建設",
  "三井住友建設",
]

export function LogoSlider() {
  const items = [...COMPANIES, ...COMPANIES]

  return (
    <div className="border-y border-warm-200 bg-white py-6 sm:py-8">
      <div className="logo-slider">
        <div className="logo-slider-track">
          {items.map((company, i) => (
            <div
              key={`${company}-${i}`}
              className="flex shrink-0 items-center gap-2.5 px-7"
            >
              <Building2 className="h-7 w-7 text-primary-400" />
              <span className="whitespace-nowrap text-base font-bold text-gray-600 tracking-tight">
                {company}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
