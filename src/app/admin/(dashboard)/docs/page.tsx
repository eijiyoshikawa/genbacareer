import Link from "next/link"
import type { Metadata } from "next"
import {
  BookOpen,
  ArrowRight,
  FileText,
} from "lucide-react"

export const metadata: Metadata = {
  title: "編集・運用ドキュメント",
  robots: { index: false, follow: false },
}

const DOCS = [
  {
    href: "/admin/docs/article-guidelines",
    title: "記事執筆ガイドライン",
    desc: "高品質な建設業界キャリア記事を投入するための SEO / E-E-A-T / 文体ルール。執筆前に必読。",
    icon: FileText,
    badge: "最重要",
  },
] as const

export default function AdminDocsIndexPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6 text-primary-600" />
          編集・運用ドキュメント
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          ゲンバキャリアの編集部 / 運用メンバー向けの内部マニュアル集です。
        </p>
      </header>

      <ul className="space-y-3">
        {DOCS.map((d) => {
          const Icon = d.icon
          return (
            <li key={d.href}>
              <Link
                href={d.href}
                className="group flex items-start gap-4 border border-gray-200 bg-white p-4 shadow-sm hover:border-primary-400 hover:shadow-md transition"
              >
                <div className="flex h-10 w-10 items-center justify-center bg-primary-50 shrink-0">
                  <Icon className="h-5 w-5 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-gray-900 group-hover:text-primary-700">
                      {d.title}
                    </h2>
                    {d.badge && (
                      <span className="inline-flex items-center bg-rose-100 text-rose-700 text-[10px] font-bold px-1.5 py-0.5">
                        {d.badge}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-gray-600 leading-relaxed">
                    {d.desc}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 shrink-0 group-hover:text-primary-600" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
