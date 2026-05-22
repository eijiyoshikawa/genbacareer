export const CATEGORIES = [
  { value: "construction", label: "建築・躯体工事" },
  { value: "civil", label: "土木工事" },
  { value: "electrical", label: "電気・設備工事" },
  { value: "interior", label: "内装・仕上げ工事" },
  { value: "demolition", label: "解体・産廃" },
  { value: "driver", label: "ドライバー・重機" },
  { value: "management", label: "施工管理・現場監督" },
  { value: "survey", label: "測量・設計" },
  { value: "other", label: "その他" },
] as const

export type CategoryValue = (typeof CATEGORIES)[number]["value"]

// 建設業に該当するカテゴリ（"other" を除く）。
// 公開向け求人検索の where 句や groupBy のフィルタとして使用する。
export const CONSTRUCTION_CATEGORY_VALUES = [
  "construction",
  "civil",
  "electrical",
  "interior",
  "demolition",
  "driver",
  "management",
  "survey",
] as const satisfies ReadonlyArray<CategoryValue>

export type ConstructionCategoryValue =
  (typeof CONSTRUCTION_CATEGORY_VALUES)[number]

export function isConstructionCategory(
  value: string
): value is ConstructionCategoryValue {
  return (CONSTRUCTION_CATEGORY_VALUES as readonly string[]).includes(value)
}

export function getCategoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value
}
