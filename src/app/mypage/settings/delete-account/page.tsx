import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { AlertTriangle } from "lucide-react"
import { DeleteAccountForm } from "./form"

export const metadata: Metadata = {
  title: "退会する",
  robots: { index: false, follow: false },
}

export default async function DeleteAccountPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/mypage/settings/delete-account")

  const [user, activeAppCount] = await Promise.all([
    prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true },
      })
      .catch(() => null),
    prisma.application
      .count({
        where: {
          userId: session.user.id,
          status: { in: ["applied", "reviewing", "interview"] },
        },
      })
      .catch(() => 0),
  ])

  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        退会する
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        ゲンバキャリアからの退会手続きです。退会後はログイン・応募・スカウト受信ができなくなります。
      </p>

      <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <p className="font-bold">退会前にご確認ください</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          <li>登録された氏名・メール・電話・住所・履歴書情報は退会と同時に匿名化されます。</li>
          <li>
            お気に入り / 保存検索 / フォロー企業 / 通知 / メッセージテンプレートは完全に削除されます。
          </li>
          <li>
            過去の応募履歴は職業安定法に基づく記録保存義務のため、企業の業務記録として 1 年間保管されますが、企業側からあなたを特定する情報（氏名・連絡先・履歴書）は表示されなくなります。
          </li>
          <li>同じメールアドレスでの再登録はすぐに可能です。</li>
          <li>
            退会前に「個人データのダウンロード」から記録を保存いただけます（
            <Link href="/mypage/settings" className="underline">
              アカウント設定
            </Link>
            ）。
          </li>
        </ul>
      </div>

      {activeAppCount > 0 && (
        <div className="mt-4 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-bold">選考中の応募が {activeAppCount} 件あります</p>
          <p className="mt-1 text-xs">
            選考が継続中の応募がある状態で退会すると、企業からの連絡を受け取れなくなります。
            退会前に応募状況をご確認いただくことをおすすめします。
          </p>
        </div>
      )}

      <div className="mt-6 border bg-white p-6">
        <p className="text-sm text-gray-700">
          現在のアカウント: <span className="font-bold">{user.email}</span>
        </p>
        <DeleteAccountForm />
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/mypage"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          マイページに戻る
        </Link>
      </div>
    </div>
  )
}
