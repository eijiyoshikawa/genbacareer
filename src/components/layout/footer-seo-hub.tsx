import Link from "next/link"
import { CATEGORIES } from "@/lib/categories"
import { PREFECTURES_LIST } from "@/lib/prefectures"

/**
 * Footer に乗せる SEO ハブ。
 *
 * 検索エンジン (Google / Bing) が全ページから 47 都道府県 × 8 職種 ×
 * 主要組み合わせ にクロール経路を持てるようにするための内部リンク群。
 *
 * デザインは検索エンジン向けの「見えないナビ」というより、ユーザーにも
 * 自然な「全国の建設業求人を地域・職種から探す」ナビ として有用な形にする。
 *
 * 注意: details 要素で SP/PC とも初期は折り畳み、不必要に縦に伸びないように
 * する。Google は details 内のリンクもクロールするので SEO 効果は変わらない。
 */

// 県/府/都/道 を取り除いた短縮表示を使う (Footer の限られた幅向け)
const PREFECTURES_HUB = PREFECTURES_LIST.map((p) => ({
  slug: p.slug,
  label: p.label.replace(/[県府都道]$/, ""),
}))

// 主要な 都道府県 × 職種 のクロスリンク (求人ボリュームが大きく取れる組み合わせ)。
// Footer に詰め込みすぎないように主要 10 件のみ。残りは prefecture / category ページ経由でクロールされる。
const HIGHLIGHT_CROSS_LINKS: Array<{
  prefecture: string
  prefSlug: string
  category: string
  catLabel: string
}> = [
  { prefecture: "東京", prefSlug: "tokyo", category: "construction", catLabel: "建築・躯体" },
  { prefecture: "東京", prefSlug: "tokyo", category: "management", catLabel: "施工管理" },
  { prefecture: "神奈川", prefSlug: "kanagawa", category: "construction", catLabel: "建築・躯体" },
  { prefecture: "大阪", prefSlug: "osaka", category: "civil", catLabel: "土木" },
  { prefecture: "大阪", prefSlug: "osaka", category: "electrical", catLabel: "電気・設備" },
  { prefecture: "愛知", prefSlug: "aichi", category: "construction", catLabel: "建築・躯体" },
  { prefecture: "福岡", prefSlug: "fukuoka", category: "interior", catLabel: "内装・仕上げ" },
  { prefecture: "北海道", prefSlug: "hokkaido", category: "driver", catLabel: "ドライバー・重機" },
  { prefecture: "宮城", prefSlug: "miyagi", category: "civil", catLabel: "土木" },
  { prefecture: "兵庫", prefSlug: "hyogo", category: "demolition", catLabel: "解体・産廃" },
]

export function FooterSeoHub() {
  const constructionCategories = CATEGORIES.filter((c) => c.value !== "other")

  return (
    <section className="border-t border-stone-700 bg-stone-900 text-gray-300">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        <details className="group">
          <summary className="press inline-flex items-center gap-2 cursor-pointer list-none text-sm font-bold text-white hover:text-primary-300">
            <span className="inline-flex h-5 w-5 items-center justify-center bg-primary-500 text-[10px] text-ink-900 font-extrabold group-open:rotate-45 transition-transform">
              +
            </span>
            全国の建設業求人を地域・職種から探す
          </summary>

          <div className="mt-6 space-y-6">
            {/* 都道府県 (47) */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 tracking-wide">
                エリアから探す (47 都道府県)
              </h3>
              <ul className="mt-2 grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-x-3 gap-y-1.5">
                {PREFECTURES_HUB.map((p) => (
                  <li key={p.slug}>
                    <Link
                      href={`/${p.slug}`}
                      className="press text-[11px] text-gray-400 hover:text-primary-300 transition"
                      prefetch={false}
                    >
                      {p.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 職種 */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 tracking-wide">
                職種から探す (8 カテゴリ)
              </h3>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
                {constructionCategories.map((c) => (
                  <li key={c.value}>
                    <Link
                      href={`/categories/${c.value}`}
                      className="press text-[11px] text-gray-400 hover:text-primary-300 transition"
                      prefetch={false}
                    >
                      {c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 主要 都道府県 × 職種 */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 tracking-wide">
                人気の組み合わせ
              </h3>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-3 gap-y-1.5">
                {HIGHLIGHT_CROSS_LINKS.map((c) => (
                  <li key={`${c.prefSlug}-${c.category}`}>
                    <Link
                      href={`/${c.prefSlug}/${c.category}`}
                      className="press text-[11px] text-gray-400 hover:text-primary-300 transition"
                      prefetch={false}
                    >
                      {c.prefecture} × {c.catLabel}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 働き方 */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 tracking-wide">
                働き方から探す
              </h3>
              <ul className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5">
                {[
                  { q: "未経験", label: "未経験 OK" },
                  { q: "資格", label: "資格取得支援" },
                  { q: "寮", label: "寮・社宅完備" },
                  { q: "週休2日", label: "週休 2 日" },
                  { q: "日払い", label: "日払い OK" },
                  { q: "高収入", label: "高収入" },
                  { q: "直行直帰", label: "直行直帰" },
                  { q: "経験者", label: "経験者優遇" },
                ].map((w) => (
                  <li key={w.q}>
                    <Link
                      href={`/jobs?q=${encodeURIComponent(w.q)}`}
                      className="press text-[11px] text-gray-400 hover:text-primary-300 transition"
                      prefetch={false}
                    >
                      {w.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </details>
      </div>
    </section>
  )
}
