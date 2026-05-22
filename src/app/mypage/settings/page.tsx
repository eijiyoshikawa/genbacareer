import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Settings, Mail, KeyRound, Trash2, ChevronRight, Download } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "アカウント設定",
  robots: { index: false, follow: false },
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/mypage/settings")

  const rows: Array<{
    href: string
    icon: typeof Settings
    title: string
    desc: string
    danger?: boolean
  }> = [
    {
      href: "/mypage/profile",
      icon: Settings,
      title: "プロフィール編集",
      desc: "氏名・住所・希望条件などを更新",
    },
    {
      href: "/mypage/notifications",
      icon: Mail,
      title: "通知設定",
      desc: "メール / LINE / Web Push の配信設定",
    },
    {
      href: "/forgot-password",
      icon: KeyRound,
      title: "パスワード変更",
      desc: "パスワード再設定メールを送信",
    },
    {
      href: "/api/users/me/export",
      icon: Download,
      title: "個人データのダウンロード",
      desc: "登録情報・応募履歴等を JSON 形式で取得（個人情報保護法 第 33 条）",
    },
    {
      href: "/mypage/settings/delete-account",
      icon: Trash2,
      title: "退会する",
      desc: "アカウントと個人情報を削除",
      danger: true,
    },
  ]

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Settings className="h-6 w-6 text-primary-600" />
        アカウント設定
      </h1>

      <ul className="mt-6 divide-y border bg-white">
        {rows.map((r) => {
          const Icon = r.icon
          return (
            <li key={r.href}>
              <Link
                href={r.href}
                className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center ${
                    r.danger
                      ? "bg-red-50 text-red-600"
                      : "bg-primary-50 text-primary-600"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-bold ${
                      r.danger ? "text-red-700" : "text-gray-900"
                    }`}
                  >
                    {r.title}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">{r.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-400" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
