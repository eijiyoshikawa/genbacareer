// 記事カテゴリの定義（main ブランチの方針に準拠）
export const ARTICLE_CATEGORIES = [
  { value: "career", label: "転職・キャリア" },
  { value: "salary", label: "年収・給与" },
  { value: "license", label: "資格・免許" },
  { value: "job-type", label: "職種解説" },
  { value: "industry", label: "業界知識" },
  { value: "interview", label: "体験談" },
] as const

export type ArticleCategoryValue = (typeof ARTICLE_CATEGORIES)[number]["value"]

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  ARTICLE_CATEGORIES.map((c) => [c.value, c.label])
)
