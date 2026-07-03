import Link from "next/link"
import {
  CheckCircle,
  MagnifyingGlass,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登録ありがとうございます",
  robots: { index: false, follow: false },
}

export default async function WizardDonePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center bg-primary-50">
        <CheckCircle weight="fill" className="h-10 w-10 text-primary-600" />
      </div>

      <h1 className="mt-4 text-2xl font-extrabold text-gray-900">
        ご登録が完了しました
      </h1>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">
        メール確認は不要です。
        <br />
        さっそく求人を探して、そのまま応募できます。
      </p>

      <div className="mt-6 grid gap-2">
        <Link
          href="/jobs"
          className="press inline-flex items-center justify-center gap-1.5 bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-primary-700"
        >
          <MagnifyingGlass className="h-4 w-4" weight="bold" />
          求人を探す
          <ArrowRight className="h-4 w-4" weight="bold" />
        </Link>
        <Link
          href="/mypage"
          className="press inline-flex items-center justify-center gap-1.5 border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700"
        >
          マイページへ
        </Link>
      </div>

      <p className="mt-6 text-[11px] text-gray-400">
        マイページから、資格・学歴・希望条件などのプロフィールを追加できます。
      </p>
      <p className="mt-2 text-[11px] text-[#06C755] font-medium">
        ✓ マイページの「LINE 連携」で、新着求人やスカウトを LINE で受け取れます。
      </p>
    </div>
  )
}
