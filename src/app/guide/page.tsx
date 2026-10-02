import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import { CATEGORY_LABELS } from "@/lib/article-categories"

export const revalidate = 3600

export const metadata: Metadata = {
  title: "転職成功ノウハウ｜面接対策・退職・履歴書ガイド | ゲンバキャリア",
  description:
    "建設業の転職を成功させるためのノウハウ集。面接対策、円満退職の進め方、履歴書・職務経歴書づくり、年収アップ、資格取得まで。無料の適職診断・書類作成ツールも。",
  alternates: { canonical: "/guide" },
}

type Theme = {
  label: string
  desc: string
  href: string
  accent: string
}

const THEMES: Theme[] = [
  {
    label: "転職の準備・進め方",
    desc: "はじめての転職でも迷わない、全体の流れと準備のコツ。",
    href: "/journal?category=career",
    accent: "from-primary-500 to-orange-600",
  },
  {
    label: "面接対策",
    desc: "よく聞かれる質問と答え方、当日のマナーまで。",
    href: "/journal?category=career",
    accent: "from-rose-500 to-red-600",
  },
  {
    label: "履歴書・職務経歴書づくり",
    desc: "建設向けテンプレで、かんたんに書類を作成。",
    href: "/mypage/resume",
    accent: "from-amber-500 to-orange-600",
  },
  {
    label: "退職・円満退社",
    desc: "退職の伝え方・引き継ぎ・タイミングの基本。",
    href: "/journal?category=career",
    accent: "from-emerald-500 to-teal-600",
  },
  {
    label: "年収を上げる",
    desc: "建設業で収入を伸ばす職種・資格・キャリアの考え方。",
    href: "/journal?category=salary",
    accent: "from-violet-500 to-purple-600",
  },
  {
    label: "資格でキャリアアップ",
    desc: "施工管理技士・電気工事士など、武器になる資格。",
    href: "/journal?category=license",
    accent: "from-cyan-500 to-blue-600",
  },
]

export default async function GuidePage() {
  const articles = await prisma.article
    .findMany({
      where: { ...publishedArticleFilter(), category: { in: ["career", "salary", "license"] } },
      orderBy: { publishedAt: "desc" },
      take: 6,
      select: { slug: true, title: true, category: true, imageUrl: true },
    })
    .catch(() => [])

  return (
    <div className="bg-warm-50">
      {/* ヒーロー */}
      <div className="relative overflow-hidden bg-brand-gradient text-white">
        <div className="mx-auto max-w-4xl px-4 py-10 text-center sm:px-6 sm:py-14">
          <h1 className="text-2xl font-black leading-tight tracking-tight sm:text-4xl">
            転職成功ノウハウ
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-white/90">
            面接・退職・書類づくりから年収アップまで。建設業の転職を成功させるためのガイド。
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Link
              href="/shindan"
              className="press inline-flex items-center justify-center bg-white px-5 py-2.5 text-sm font-extrabold text-primary-700 hover:bg-orange-50"
            >
              無料の適職診断を受ける →
            </Link>
            <Link
              href="/mypage/resume"
              className="press inline-flex items-center justify-center border border-white/40 px-5 py-2.5 text-sm font-bold text-white hover:bg-white/10"
            >
              履歴書・職務経歴書をつくる
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* テーマ別 */}
        <h2 className="section-bar mb-4 text-xl font-bold text-gray-900 sm:text-2xl">
          テーマから探す
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {THEMES.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="press group block overflow-hidden border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
            >
              <div className={`h-2 bg-gradient-to-r ${t.accent}`} />
              <div className="p-4">
                <p className="text-base font-extrabold text-gray-900 group-hover:text-primary-700">
                  {t.label}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-gray-600">
                  {t.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* 最新記事 */}
        {articles.length > 0 && (
          <>
            <div className="mb-4 mt-10 flex items-end justify-between">
              <h2 className="section-bar text-xl font-bold text-gray-900 sm:text-2xl">
                新着ノウハウ記事
              </h2>
              <Link
                href="/journal"
                className="text-sm font-bold text-primary-600 hover:text-primary-700"
              >
                すべて見る →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <Link
                  key={a.slug}
                  href={`/journal/${a.slug}`}
                  className="press card group block overflow-hidden"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                    {a.imageUrl ? (
                      <Image
                        src={a.imageUrl}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 100vw, 33vw"
                        className="object-cover transition duration-300 group-hover:scale-105"
                        unoptimized={
                          !a.imageUrl.startsWith("/") &&
                          !a.imageUrl.includes("supabase.co")
                        }
                      />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-primary-600">
                      {CATEGORY_LABELS[a.category] ?? a.category}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-sm font-bold leading-snug text-gray-900 group-hover:text-primary-700">
                      {a.title}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
