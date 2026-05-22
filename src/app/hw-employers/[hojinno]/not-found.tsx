import Link from "next/link"
import { ArrowLeft, Building2 } from "lucide-react"

export default function HwEmployerNotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Building2 className="mx-auto h-12 w-12 text-gray-300" />
      <h1 className="mt-4 text-xl font-bold text-gray-900">事業所が見つかりません</h1>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
        この事業所の求人は現在公開されていない、または法人番号が不正な可能性があります。
      </p>
      <Link
        href="/hw-jobs"
        className="mt-6 inline-flex items-center gap-1  bg-primary-500 px-5 py-2 text-sm font-medium text-white hover:bg-primary-600"
      >
        <ArrowLeft className="h-4 w-4" />
        求人一覧へ戻る
      </Link>
    </div>
  )
}
