/**
 * 都道府県名 ↔ URL スラッグの双方向マップ。
 * 地域 × 職種 LP (13.2) と sitemap で利用。
 */

export const PREFECTURE_SLUG_MAP = {
  "北海道": "hokkaido",
  "青森県": "aomori",
  "岩手県": "iwate",
  "宮城県": "miyagi",
  "秋田県": "akita",
  "山形県": "yamagata",
  "福島県": "fukushima",
  "茨城県": "ibaraki",
  "栃木県": "tochigi",
  "群馬県": "gunma",
  "埼玉県": "saitama",
  "千葉県": "chiba",
  "東京都": "tokyo",
  "神奈川県": "kanagawa",
  "新潟県": "niigata",
  "富山県": "toyama",
  "石川県": "ishikawa",
  "福井県": "fukui",
  "山梨県": "yamanashi",
  "長野県": "nagano",
  "岐阜県": "gifu",
  "静岡県": "shizuoka",
  "愛知県": "aichi",
  "三重県": "mie",
  "滋賀県": "shiga",
  "京都府": "kyoto",
  "大阪府": "osaka",
  "兵庫県": "hyogo",
  "奈良県": "nara",
  "和歌山県": "wakayama",
  "鳥取県": "tottori",
  "島根県": "shimane",
  "岡山県": "okayama",
  "広島県": "hiroshima",
  "山口県": "yamaguchi",
  "徳島県": "tokushima",
  "香川県": "kagawa",
  "愛媛県": "ehime",
  "高知県": "kochi",
  "福岡県": "fukuoka",
  "佐賀県": "saga",
  "長崎県": "nagasaki",
  "熊本県": "kumamoto",
  "大分県": "oita",
  "宮崎県": "miyazaki",
  "鹿児島県": "kagoshima",
  "沖縄県": "okinawa",
} as const

export type PrefectureSlug =
  (typeof PREFECTURE_SLUG_MAP)[keyof typeof PREFECTURE_SLUG_MAP]

const SLUG_TO_NAME = Object.fromEntries(
  Object.entries(PREFECTURE_SLUG_MAP).map(([k, v]) => [v, k])
) as Record<string, string>

export function getPrefectureNameBySlug(slug: string): string | null {
  return SLUG_TO_NAME[slug] ?? null
}

export function getPrefectureSlugByName(name: string): string | null {
  return (PREFECTURE_SLUG_MAP as Record<string, string>)[name] ?? null
}
