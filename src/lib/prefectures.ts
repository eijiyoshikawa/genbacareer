/**
 * 都道府県のスラッグ ↔ ラベル マッピング (47 + null 安全)。
 *
 * 過去ファイル横断で同じ Record が 3〜4 箇所に重複していたものを統合。
 * sitemap.ts や Footer SEO ハブ、各種 LP 系ページから共通参照する。
 */

export const PREFECTURES_LIST: Array<{ slug: string; label: string }> = [
  { slug: "hokkaido", label: "北海道" },
  { slug: "aomori", label: "青森県" },
  { slug: "iwate", label: "岩手県" },
  { slug: "miyagi", label: "宮城県" },
  { slug: "akita", label: "秋田県" },
  { slug: "yamagata", label: "山形県" },
  { slug: "fukushima", label: "福島県" },
  { slug: "ibaraki", label: "茨城県" },
  { slug: "tochigi", label: "栃木県" },
  { slug: "gunma", label: "群馬県" },
  { slug: "saitama", label: "埼玉県" },
  { slug: "chiba", label: "千葉県" },
  { slug: "tokyo", label: "東京都" },
  { slug: "kanagawa", label: "神奈川県" },
  { slug: "niigata", label: "新潟県" },
  { slug: "toyama", label: "富山県" },
  { slug: "ishikawa", label: "石川県" },
  { slug: "fukui", label: "福井県" },
  { slug: "yamanashi", label: "山梨県" },
  { slug: "nagano", label: "長野県" },
  { slug: "gifu", label: "岐阜県" },
  { slug: "shizuoka", label: "静岡県" },
  { slug: "aichi", label: "愛知県" },
  { slug: "mie", label: "三重県" },
  { slug: "shiga", label: "滋賀県" },
  { slug: "kyoto", label: "京都府" },
  { slug: "osaka", label: "大阪府" },
  { slug: "hyogo", label: "兵庫県" },
  { slug: "nara", label: "奈良県" },
  { slug: "wakayama", label: "和歌山県" },
  { slug: "tottori", label: "鳥取県" },
  { slug: "shimane", label: "島根県" },
  { slug: "okayama", label: "岡山県" },
  { slug: "hiroshima", label: "広島県" },
  { slug: "yamaguchi", label: "山口県" },
  { slug: "tokushima", label: "徳島県" },
  { slug: "kagawa", label: "香川県" },
  { slug: "ehime", label: "愛媛県" },
  { slug: "kochi", label: "高知県" },
  { slug: "fukuoka", label: "福岡県" },
  { slug: "saga", label: "佐賀県" },
  { slug: "nagasaki", label: "長崎県" },
  { slug: "kumamoto", label: "熊本県" },
  { slug: "oita", label: "大分県" },
  { slug: "miyazaki", label: "宮崎県" },
  { slug: "kagoshima", label: "鹿児島県" },
  { slug: "okinawa", label: "沖縄県" },
] as const

/** slug → label */
export const PREFECTURE_SLUG_TO_LABEL: Record<string, string> =
  Object.fromEntries(PREFECTURES_LIST.map((p) => [p.slug, p.label]))

/** label → slug */
export const PREFECTURE_LABEL_TO_SLUG: Record<string, string> =
  Object.fromEntries(PREFECTURES_LIST.map((p) => [p.label, p.slug]))

/** 47 都道府県のスラッグ配列 (sitemap など) */
export const PREFECTURE_SLUGS: ReadonlyArray<string> = PREFECTURES_LIST.map(
  (p) => p.slug,
)
