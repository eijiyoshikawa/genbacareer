/**
 * Google Maps API キー未設定時のテキスト一覧フォールバック (11.2)。
 * 地域ブロック別にグルーピングして都道府県別の掲載件数をリスト表示。
 *
 * 一般ユーザーには「エリアから探す」一覧として自然に見える。
 * API キー未設定の開発者向け案内 (showSetupNotice) は本番では非表示。
 */

import Link from "next/link"
import { getPrefectureSlugByName } from "@/lib/prefecture-slugs"

interface MapPoint {
  prefecture: string
  count: number
  lat: number
  lng: number
}

const REGION_BLOCKS: { name: string; prefectures: string[] }[] = [
  { name: "北海道・東北", prefectures: ["北海道", "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"] },
  { name: "関東", prefectures: ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"] },
  { name: "中部", prefectures: ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"] },
  { name: "近畿", prefectures: ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"] },
  { name: "中国・四国", prefectures: ["鳥取県", "島根県", "岡山県", "広島県", "山口県", "徳島県", "香川県", "愛媛県", "高知県"] },
  { name: "九州・沖縄", prefectures: ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"] },
]

export function JobMapFallback({
  points,
  showSetupNotice = false,
}: {
  points: MapPoint[]
  /** Maps API キー未設定の開発者向け案内。本番では false で非表示 */
  showSetupNotice?: boolean
}) {
  const byPref = new Map(points.map((p) => [p.prefecture, p.count]))

  return (
    <div className="space-y-6">
      {showSetupNotice && (
        <div className="border-2 border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Google Maps API キー (<code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>)
          が未設定のため、リスト表示でフォールバックしています。
          地図表示には Google Cloud Console で Maps JavaScript API を有効化してください。
        </div>
      )}

      {REGION_BLOCKS.map((block) => (
        <section key={block.name}>
          <h2 className="text-sm font-bold text-gray-900 mb-2">
            {block.name}
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {block.prefectures.map((pref) => {
              const count = byPref.get(pref) ?? 0
              const slug = getPrefectureSlugByName(pref)
              const href = slug && count > 0 ? `/${slug}` : "/jobs"
              const disabled = count === 0
              return (
                <Link
                  key={pref}
                  href={href}
                  aria-disabled={disabled}
                  className={`flex items-center justify-between border px-3 py-2 text-sm transition ${
                    disabled
                      ? "border-gray-200 text-gray-400 cursor-default"
                      : "border-gray-300 text-gray-700 hover:bg-primary-50 hover:border-primary-400"
                  }`}
                >
                  <span>{pref}</span>
                  <span className={`text-xs font-bold ${
                    count > 0 ? "text-primary-700" : "text-gray-400"
                  }`}>
                    {count}
                  </span>
                </Link>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
