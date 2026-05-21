"use client"

import { PREFECTURES_LIST } from "@/lib/prefectures"

/**
 * 8 つの地域ブロックに 47 都道府県をマッピングし、
 * 段階的に「ブロック → 都道府県」で選ばせる軽量 UI。
 *
 * 地図 SVG は使わず、ブロックタイルに県を並べる方式 (a11y / 実装軽量を優先)。
 */

type Region = {
  key: string
  label: string
  prefSlugs: string[]
  /** マイナビ風: ブロックタイルの色 */
  color: string
}

const REGIONS: Region[] = [
  {
    key: "hokkaido-tohoku",
    label: "北海道・東北",
    prefSlugs: ["hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima"],
    color: "from-sky-100 to-sky-50",
  },
  {
    key: "kanto",
    label: "関東",
    prefSlugs: ["ibaraki", "tochigi", "gunma", "saitama", "chiba", "tokyo", "kanagawa"],
    color: "from-amber-100 to-amber-50",
  },
  {
    key: "koshinetsu",
    label: "甲信越",
    prefSlugs: ["niigata", "yamanashi", "nagano"],
    color: "from-emerald-100 to-emerald-50",
  },
  {
    key: "hokuriku",
    label: "北陸",
    prefSlugs: ["toyama", "ishikawa", "fukui"],
    color: "from-cyan-100 to-cyan-50",
  },
  {
    key: "tokai",
    label: "東海",
    prefSlugs: ["gifu", "shizuoka", "aichi", "mie"],
    color: "from-rose-100 to-rose-50",
  },
  {
    key: "kansai",
    label: "関西",
    prefSlugs: ["shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama"],
    color: "from-orange-100 to-orange-50",
  },
  {
    key: "chugoku-shikoku",
    label: "中国・四国",
    prefSlugs: [
      "tottori", "shimane", "okayama", "hiroshima", "yamaguchi",
      "tokushima", "kagawa", "ehime", "kochi",
    ],
    color: "from-violet-100 to-violet-50",
  },
  {
    key: "kyushu-okinawa",
    label: "九州・沖縄",
    prefSlugs: ["fukuoka", "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa"],
    color: "from-lime-100 to-lime-50",
  },
]

export function RegionBlockPicker({
  selectedPrefSlug,
  onSelect,
}: {
  selectedPrefSlug?: string
  onSelect: (prefSlug: string, prefLabel: string) => void
}) {
  // 現在選択中の県がどの region に属するか
  const selectedRegion = selectedPrefSlug
    ? REGIONS.find((r) => r.prefSlugs.includes(selectedPrefSlug))
    : null

  return (
    <div className="space-y-3">
      {REGIONS.map((region) => {
        const isOpen = selectedRegion?.key === region.key
        return (
          <details
            key={region.key}
            open={isOpen}
            className={`bg-gradient-to-br ${region.color} border border-gray-200 overflow-hidden transition`}
          >
            <summary className="press cursor-pointer list-none px-4 py-3 flex items-center justify-between">
              <span className="font-extrabold text-gray-900 text-sm">
                {region.label}
                <span className="ml-2 text-[10px] font-medium text-gray-500">
                  {region.prefSlugs.length} 都道府県
                </span>
              </span>
              <span className="text-gray-400 text-sm">▾</span>
            </summary>
            <div className="bg-white border-t border-gray-200 p-3">
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {region.prefSlugs.map((slug) => {
                  const pref = PREFECTURES_LIST.find((p) => p.slug === slug)
                  if (!pref) return null
                  const isSelected = selectedPrefSlug === slug
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => onSelect(slug, pref.label)}
                      className={`press px-2 py-2.5 text-sm font-bold text-center transition ${
                        isSelected
                          ? "bg-primary-600 text-white"
                          : "bg-warm-50 text-gray-800 hover:bg-primary-50 hover:text-primary-700"
                      }`}
                    >
                      {pref.label.replace(/[県府都道]$/, "")}
                    </button>
                  )
                })}
              </div>
            </div>
          </details>
        )
      })}
    </div>
  )
}
