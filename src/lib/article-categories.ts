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

/** マガジン（/journal 以下）が対象とする 6 カテゴリの値一覧。 */
export const MAGAZINE_CATEGORY_VALUES = ARTICLE_CATEGORIES.map((c) => c.value)

export const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  ARTICLE_CATEGORIES.map((c) => [c.value, c.label])
)

/** ヘルプ記事（/help 以下）のカテゴリ値。help-articles.ts の helpCategory() と対応。 */
export const HELP_CATEGORY_VALUES = ["help-seeker", "help-employer"] as const

/**
 * Article テーブルが受け付ける全カテゴリ値（マガジン + ヘルプ）。
 * admin の記事 CRUD API で category を検証する際の許可リストとして使う
 * （自由入力にすると、想定外の値や誤ってヘルプ⇄マガジン間で
 * カテゴリを混同する入力をそのまま保存できてしまう）。
 */
export const ALL_ARTICLE_CATEGORY_VALUES = [
  ...MAGAZINE_CATEGORY_VALUES,
  ...HELP_CATEGORY_VALUES,
]
