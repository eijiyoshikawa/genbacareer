import Link from "next/link"
import { CATEGORIES } from "@/lib/categories"
import { MapPin, Briefcase } from "@phosphor-icons/react/dist/ssr"

/**
 * 求人詳細ページの下部に出す内部リンク群。
 *
 * 同じ都道府県の他職種・同じ職種の他都道府県の LP に誘導することで、
 * (1) ユーザーの代替探索を助ける (2) Google に内部リンク網を見せる、
 * の 2 つを狙う。
 */

const PREFECTURE_LABEL_TO_SLUG: Record<string, string> = {
  北海道: "hokkaido", 青森県: "aomori", 岩手県: "iwate", 宮城県: "miyagi",
  秋田県: "akita", 山形県: "yamagata", 福島県: "fukushima", 茨城県: "ibaraki",
  栃木県: "tochigi", 群馬県: "gunma", 埼玉県: "saitama", 千葉県: "chiba",
  東京都: "tokyo", 神奈川県: "kanagawa", 新潟県: "niigata", 富山県: "toyama",
  石川県: "ishikawa", 福井県: "fukui", 山梨県: "yamanashi", 長野県: "nagano",
  岐阜県: "gifu", 静岡県: "shizuoka", 愛知県: "aichi", 三重県: "mie",
  滋賀県: "shiga", 京都府: "kyoto", 大阪府: "osaka", 兵庫県: "hyogo",
  奈良県: "nara", 和歌山県: "wakayama", 鳥取県: "tottori", 島根県: "shimane",
  岡山県: "okayama", 広島県: "hiroshima", 山口県: "yamaguchi", 徳島県: "tokushima",
  香川県: "kagawa", 愛媛県: "ehime", 高知県: "kochi", 福岡県: "fukuoka",
  佐賀県: "saga", 長崎県: "nagasaki", 熊本県: "kumamoto", 大分県: "oita",
  宮崎県: "miyazaki", 鹿児島県: "kagoshima", 沖縄県: "okinawa",
}

// 近隣の都道府県マップ (求人ボリュームの観点で「同じ商圏」)
const NEIGHBOR_PREFECTURES: Record<string, string[]> = {
  東京都: ["神奈川県", "埼玉県", "千葉県"],
  神奈川県: ["東京都", "埼玉県", "千葉県"],
  埼玉県: ["東京都", "神奈川県", "千葉県", "群馬県"],
  千葉県: ["東京都", "神奈川県", "埼玉県", "茨城県"],
  大阪府: ["京都府", "兵庫県", "奈良県", "滋賀県"],
  京都府: ["大阪府", "兵庫県", "奈良県", "滋賀県"],
  兵庫県: ["大阪府", "京都府", "奈良県", "岡山県"],
  愛知県: ["岐阜県", "三重県", "静岡県"],
  福岡県: ["佐賀県", "大分県", "熊本県"],
  北海道: ["青森県"],
}

export function RelatedAreaCategoryLinks({
  category,
  categoryLabel,
  prefecture,
}: {
  category: string
  categoryLabel: string
  prefecture: string
}) {
  const prefSlug = PREFECTURE_LABEL_TO_SLUG[prefecture]
  // 同職種の他都道府県 (近隣 + 主要都市の固定セット)
  const otherPrefSuggestions = [
    ...(NEIGHBOR_PREFECTURES[prefecture] ?? []),
    ...["東京都", "大阪府", "愛知県", "福岡県"].filter(
      (p) => p !== prefecture && !(NEIGHBOR_PREFECTURES[prefecture] ?? []).includes(p),
    ),
  ].slice(0, 5)

  // 同地域の他職種 (建設業 8 カテゴリのうち current を除く)
  const otherCategories = CATEGORIES.filter(
    (c) => c.value !== "other" && c.value !== category,
  )

  return (
    <section className="mt-8 border-t pt-6">
      <h2 className="text-sm font-bold text-gray-700 mb-4">
        他のエリア・職種の求人も探す
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* 同職種の他都道府県 */}
        {prefSlug && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-2">
              <MapPin weight="duotone" className="h-3.5 w-3.5 text-primary-500" />
              {categoryLabel}の他エリア
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {otherPrefSuggestions.map((p) => {
                const s = PREFECTURE_LABEL_TO_SLUG[p]
                if (!s) return null
                return (
                  <li key={p}>
                    <Link
                      href={`/${s}/${category}`}
                      className="press inline-flex items-center gap-1 bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition"
                    >
                      {p.replace(/[県府都道]$/, "")} × {categoryLabel}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* 同地域の他職種 */}
        {prefSlug && (
          <div>
            <p className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-2">
              <Briefcase weight="duotone" className="h-3.5 w-3.5 text-primary-500" />
              {prefecture.replace(/[県府都道]$/, "")}の他職種
            </p>
            <ul className="flex flex-wrap gap-1.5">
              {otherCategories.map((c) => (
                <li key={c.value}>
                  <Link
                    href={`/${prefSlug}/${c.value}`}
                    className="press inline-flex items-center gap-1 bg-white border border-gray-200 px-2.5 py-1 text-xs text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition"
                  >
                    {c.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
