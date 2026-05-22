import Link from "next/link"
import { findValidInvitation } from "@/lib/company-invitation"
import { InviteAcceptForm } from "./accept-form"

type Props = {
  params: Promise<{ token: string }>
}

export const dynamic = "force-dynamic"

export default async function CompanyInviteAcceptPage({ params }: Props) {
  const { token } = await params
  const invitation = await findValidInvitation(token)

  if (!invitation) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
        <div className="border bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900">
            招待リンクが無効です
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            この招待リンクは期限切れ、または既に使用されています。
            管理者に再発行を依頼してください。
          </p>
          <div className="mt-6">
            <Link
              href="/company/login"
              className="inline-block bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              ログイン画面へ
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">
          管理者アカウントの有効化
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          <strong>{invitation.company.name}</strong> の管理者として
          <strong> {invitation.email} </strong>を登録します。
          パスワードを設定してアカウントを有効化してください。
        </p>
        <div className="mt-6">
          <InviteAcceptForm token={token} email={invitation.email} />
        </div>
      </div>
    </div>
  )
}
