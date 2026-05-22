import Link from "next/link"
import {
  HardHat,
  Search,
  Home,
  Building2,
  HardHatIcon,
  Wrench,
  Truck,
  MapPin,
} from "lucide-react"
import type { Metadata } from "next"
import { LinkButton } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "ページが見つかりません",
  robots: { index: false, follow: false },
}

const POPULAR_CATEGORIES = [
  { label: "建築", href: "/jobs?category=construction", icon: HardHatIcon },
  { label: "土木", href: "/jobs?category=civil", icon: HardHat },
  { label: "電気・設備", href: "/jobs?category=electrical", icon: Wrench },
  { label: "ドライバー", href: "/jobs?category=driver", icon: Truck },
  { label: "施工管理", href: "/jobs?category=management", icon: Building2 },
] as const

const POPULAR_PREFECTURES = [
  "東京都",
  "大阪府",
  "神奈川県",
  "愛知県",
  "埼玉県",
  "千葉県",
  "兵庫県",
  "福岡県",
] as const

const PREFECTURE_TO_SLUG: Record<string, string> = {
  東京都: "tokyo",
  大阪府: "osaka",
  神奈川県: "kanagawa",
  愛知県: "aichi",
  埼玉県: "saitama",
  千葉県: "chiba",
  兵庫県: "hyogo",
  福岡県: "fukuoka",
}

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:py-24">
      <div className="text-center">
        <HardHat className="mx-auto h-16 w-16 text-primary-300" />
        <p className="mt-4 text-xs font-bold tracking-widest text-primary-600">
          404 NOT FOUND
        </p>
        <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold text-gray-900">
          ページが見つかりません
        </h1>
        <p className="mt-3 text-sm text-gray-500 leading-relaxed">
          お探しのページは削除されたか、URL が間違っている可能性があります。
          <br />
          下の人気カテゴリや都道府県から、求人を探してみてください。
        </p>

        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <LinkButton href="/jobs" variant="primary" size="lg">
            <Search className="h-4 w-4" />
            求人を検索する
          </LinkButton>
          <LinkButton href="/" variant="secondary" size="lg">
            <Home className="h-4 w-4" />
            トップページ
          </LinkButton>
        </div>
      </div>

      {/* 人気カテゴリ */}
      <section className="mt-12 border-t border-gray-200 pt-10">
        <h2 className="text-center text-sm font-bold text-gray-700">
          職種から探す
        </h2>
        <ul className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {POPULAR_CATEGORIES.map(({ label, href, icon: Icon }) => (
            <li key={label}>
              <Link
                href={href}
                className="press flex flex-col items-center gap-2 border border-gray-200 bg-white p-4 text-center hover:border-primary-400 hover:bg-primary-50 transition"
              >
                <Icon className="h-6 w-6 text-primary-500" />
                <span className="text-sm font-bold text-gray-700">
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* 人気の都道府県 */}
      <section className="mt-10">
        <h2 className="text-center text-sm font-bold text-gray-700">
          都道府県から探す
        </h2>
        <ul className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {POPULAR_PREFECTURES.map((pref) => (
            <li key={pref}>
              <Link
                href={`/${PREFECTURE_TO_SLUG[pref]}`}
                className="press inline-flex items-center gap-1 border border-gray-300 bg-white px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition"
              >
                <MapPin className="h-3.5 w-3.5 text-gray-400" />
                {pref}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
