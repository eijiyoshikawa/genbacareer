import Link from "next/link"
import type { Metadata } from "next"
import { AUTHORS } from "@/lib/authors"
import { Buildings, Certificate, ArrowRight } from "@phosphor-icons/react/dist/ssr"
import { generateBreadcrumbSchema } from "@/lib/structured-data"

export const metadata: Metadata = {
  title: "編集部・著者紹介",
  description:
    "ゲンバキャリアの記事を執筆・監修する建設業界の専門家チーム。一級施工管理技士・一級建築士・キャリアコンサルタントなど実務経験と資格を持つメンバーが、求職者と採用担当者の両面に役立つ情報を発信しています。",
  alternates: { canonical: "/authors" },
}

export default function AuthorsIndexPage() {
  const breadcrumb = generateBreadcrumbSchema([
    { name: "トップ", url: "/" },
    { name: "編集部・著者紹介", url: "/authors" },
  ])

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <header className="border-b bg-warm-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10">
          <p className="text-xs font-bold text-primary-600">EDITORIAL TEAM</p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
            編集部・著者紹介
          </h1>
          <p className="mt-3 text-sm text-gray-700 leading-relaxed">
            ゲンバキャリアの記事は、建設業界で 10 年以上の実務経験を持つ
            編集メンバーが執筆・監修しています。求職者・採用担当者の
            両面に役立つ情報を、誇張のないファクトベースで発信することを
            編集方針として掲げています。
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 space-y-5">
        {AUTHORS.map((author) => (
          <Link
            key={author.slug}
            href={`/authors/${author.slug}`}
            className="press card-elevated group flex gap-4 p-5 sm:p-6"
          >
            <div className="flex h-16 w-16 sm:h-20 sm:w-20 shrink-0 items-center justify-center bg-primary-50">
              <Buildings className="h-8 w-8 sm:h-10 sm:w-10 text-primary-500" weight="duotone" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base sm:text-lg font-extrabold text-gray-900 group-hover:text-primary-700">
                {author.name}
              </h2>
              <p className="mt-0.5 text-xs sm:text-sm font-bold text-primary-600">
                {author.role}
              </p>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed line-clamp-2">
                {author.bio}
              </p>
              {author.qualifications.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {author.qualifications.slice(0, 3).map((q) => (
                    <li
                      key={q}
                      className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2 py-0.5"
                    >
                      <Certificate weight="fill" className="h-3 w-3" />
                      {q}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ArrowRight
              weight="bold"
              className="h-5 w-5 text-gray-400 group-hover:text-primary-600 shrink-0 self-center"
            />
          </Link>
        ))}
      </section>

      <section className="border-t bg-warm-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-sm font-bold text-gray-900">編集ポリシー</h2>
          <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
            記事の品質基準・出典の扱い・利益相反の管理など、編集方針の
            詳細はこちらでご確認いただけます。
          </p>
          <Link
            href="/editorial-policy"
            className="press mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
          >
            編集ポリシーを読む
            <ArrowRight weight="bold" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
