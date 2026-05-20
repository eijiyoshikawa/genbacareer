import Link from "next/link"
import Image from "next/image"
import { Buildings } from "@phosphor-icons/react/dist/ssr"

export type FeaturedCompany = {
  id: string
  name: string
  logoUrl: string | null
}

/**
 * トップページ「注目企業ピックアップ」ロゴグリッド。
 *
 * マイナビ転職の「注目求人ピックアップ」相当。
 * 認定企業 (status=approved, source=direct) のうち logoUrl がある先頭 10 社を
 * 並べる (server side で fetch する想定 — このコンポーネントは表示のみ)。
 *
 * 5 列 × 2 段 (SP: 4 列 × 3 段)。クリックで企業ページへ遷移。
 */
export function FeaturedCompanyLogos({ companies }: { companies: FeaturedCompany[] }) {
  if (companies.length === 0) return null

  return (
    <section className="bg-white border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 section-bar">
            注目企業ピックアップ
          </h2>
          <Link
            href="/companies"
            className="text-xs font-bold text-primary-600 hover:text-primary-700"
          >
            すべて見る →
          </Link>
        </div>
        <ul className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-10 gap-2 sm:gap-3">
          {companies.slice(0, 10).map((c) => (
            <li key={c.id}>
              <Link
                href={`/companies/${c.id}`}
                className="press card-elevated flex aspect-square items-center justify-center p-3"
                title={c.name}
              >
                {c.logoUrl ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={c.logoUrl}
                      alt={`${c.name} のロゴ`}
                      fill
                      sizes="(max-width: 640px) 25vw, 10vw"
                      className="object-contain"
                      // remotePatterns に入っていない外部ホスト URL でも壊さない
                      unoptimized={
                        !c.logoUrl.startsWith("/") &&
                        !c.logoUrl.includes("supabase.co")
                      }
                    />
                  </div>
                ) : (
                  <Buildings
                    className="h-8 w-8 text-gray-300"
                    weight="duotone"
                  />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
