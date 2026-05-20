import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { DeleteAccountSection } from "./delete-account"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "アカウント設定",
}

export default async function AccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">アカウント設定</h1>

      <div className="mt-8 rounded-lg border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-semibold text-red-900">退会</h2>
        <p className="mt-2 text-sm text-red-800">
          退会すると、ご登録情報・応募履歴・スカウト・お気に入り・保存検索などの個人情報は削除され、再ログインできなくなります。
        </p>
        <p className="mt-1 text-sm text-red-800">この操作は取り消せません。</p>
        <DeleteAccountSection />
      </div>
    </div>
  )
}
