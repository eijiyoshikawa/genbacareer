import type { Metadata } from "next"
import Link from "next/link"
import { Users, Building2, ChevronRight } from "lucide-react"

export const metadata: Metadata = {
  title: "ヘルプセンター",
  description:
    "ゲンバキャリアの使い方ガイド。求職者向け・求人掲載側それぞれのマニュアルをご用意しています。",
}

export default function HelpIndexPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">ヘルプセンター</h1>
      <p className="mt-2 text-gray-600">
        サービスのご利用方法をまとめています。お探しの内容を選んでください。
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/help/seeker"
          className="border bg-white p-6 shadow-sm hover:shadow-md transition"
        >
          <div className="flex h-12 w-12 items-center justify-center bg-primary-100">
            <Users className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-3 font-bold text-gray-900">求職者向けマニュアル</h2>
          <p className="mt-2 text-sm text-gray-600">
            会員登録・求人検索・応募・スカウトなどの使い方をご案内します。
          </p>
          <p className="mt-4 inline-flex items-center text-sm font-medium text-primary-600">
            ガイドを見る <ChevronRight className="ml-1 h-4 w-4" />
          </p>
        </Link>

        <Link
          href="/help/employer"
          className="border bg-white p-6 shadow-sm hover:shadow-md transition"
        >
          <div className="flex h-12 w-12 items-center justify-center bg-primary-100">
            <Building2 className="h-6 w-6 text-primary-600" />
          </div>
          <h2 className="mt-3 font-bold text-gray-900">求人掲載側マニュアル</h2>
          <p className="mt-2 text-sm text-gray-600">
            企業登録・求人投稿・応募者管理・スカウト・料金についてご案内します。
          </p>
          <p className="mt-4 inline-flex items-center text-sm font-medium text-primary-600">
            ガイドを見る <ChevronRight className="ml-1 h-4 w-4" />
          </p>
        </Link>
      </div>

      <div className="mt-12 border bg-warm-50 p-6">
        <h2 className="font-bold text-gray-900">解決しない場合は</h2>
        <p className="mt-2 text-sm text-gray-700">
          上記で解決しない場合は、お問い合わせフォームよりサポートまでご連絡ください。
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          お問い合わせへ
        </Link>
      </div>
    </div>
  )
}
