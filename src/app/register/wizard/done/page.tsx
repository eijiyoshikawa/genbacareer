import Link from "next/link"
import {
  CheckCircle,
  EnvelopeSimple,
  ArrowRight,
  Warning,
} from "@phosphor-icons/react/dist/ssr"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "登録ありがとうございます",
  robots: { index: false, follow: false },
}

export default async function WizardDonePage({
  searchParams,
}: {
  searchParams: Promise<{ emailSent?: string }>
}) {
  const { emailSent } = await searchParams
  const mailFailed = emailSent === "0"

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 sm:py-16 text-center">
      <div className="inline-flex h-16 w-16 items-center justify-center bg-primary-50">
        <CheckCircle weight="fill" className="h-10 w-10 text-primary-600" />
      </div>

      <h1 className="mt-4 text-2xl font-extrabold text-gray-900">
        ご登録ありがとうございます
      </h1>
      {mailFailed ? (
        <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 p-3 text-left text-xs text-amber-900">
          <Warning weight="fill" className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <p className="leading-relaxed">
            ご登録は完了しましたが、確認メールの送信に失敗しました。
            下の「確認メールを再送する」からお試しください。
          </p>
        </div>
      ) : (
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          ご登録のメールアドレスに確認メールを送信しました。
          <br />
          メール内の URL をクリックして本登録を完了してください。
        </p>
      )}

      <div className="mt-6 card-elevated bg-white p-4 text-left">
        <p className="flex items-center gap-2 text-xs font-bold text-gray-700">
          <EnvelopeSimple
            weight="duotone"
            className="h-4 w-4 text-primary-500"
          />
          メールが届かない場合
        </p>
        <ul className="mt-2 space-y-1 text-[11px] text-gray-600 list-disc pl-5">
          <li>迷惑メールフォルダもご確認ください</li>
          <li>確認 URL の有効期限は 24 時間です</li>
          <li>info@let-inc.net をアドレス帳に追加していただくと届きやすくなります</li>
        </ul>
      </div>

      <div className="mt-6 grid gap-2">
        <Link
          href="/verify-email/resend"
          className="press inline-flex items-center justify-center gap-1.5 border border-gray-300 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700"
        >
          確認メールを再送する
        </Link>
        <Link
          href="/jobs"
          className="press inline-flex items-center justify-center gap-1.5 bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow-sm hover:bg-primary-700"
        >
          先に求人を見てみる
          <ArrowRight className="h-4 w-4" weight="bold" />
        </Link>
      </div>

      <p className="mt-6 text-[11px] text-gray-400">
        メール確認後、マイページから残りのプロフィール (資格・学歴・希望条件詳細)
        を追加できます。
      </p>
    </div>
  )
}
