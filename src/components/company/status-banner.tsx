import { Clock, AlertCircle } from "lucide-react"

type Props = {
  status: string
  rejectionReason: string | null
}

export function CompanyStatusBanner({ status, rejectionReason }: Props) {
  if (status === "pending") {
    return (
      <div className="mb-6 border border-yellow-300 bg-yellow-50 p-4">
        <div className="flex gap-3">
          <Clock className="h-5 w-5 shrink-0 text-yellow-600" />
          <div>
            <p className="font-bold text-yellow-900">承認待ちです</p>
            <p className="mt-1 text-sm text-yellow-800">
              ご登録ありがとうございます。現在、運営による登録内容の確認を行っております。通常 1〜2 営業日以内に承認が完了します。
            </p>
            <p className="mt-1 text-sm text-yellow-800">
              承認完了までは、求人投稿・スカウト送信はご利用いただけません。
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (status === "rejected") {
    return (
      <div className="mb-6 border border-red-300 bg-red-50 p-4">
        <div className="flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold text-red-900">ご登録を承認できませんでした</p>
            {rejectionReason && (
              <p className="mt-1 text-sm text-red-800">
                <strong>理由:</strong> {rejectionReason}
              </p>
            )}
            <p className="mt-1 text-sm text-red-800">
              詳細は{" "}
              <a
                href="mailto:info@let-inc.net"
                className="underline hover:text-red-900"
              >
                info@let-inc.net
              </a>{" "}
              までお問い合わせください。
            </p>
          </div>
        </div>
      </div>
    )
  }

  return null
}
