import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { MessageSquareText } from "lucide-react"
import type { Metadata } from "next"
import { TemplateEditor } from "./template-editor"

export const metadata: Metadata = {
  title: "応募メッセージ テンプレート",
  robots: { index: false, follow: false },
}

export default async function MessageTemplatesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const items = await prisma.applicationMessageTemplate
    .findMany({
      where: { userId: session.user.id },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    })
    .catch(() => [])

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <MessageSquareText className="h-6 w-6 text-primary-500" />
            応募メッセージ テンプレート
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            応募フォームの「ご質問・希望条件」欄にすばやく挿入できる定型文を保存できます（最大 10 件）。
          </p>
        </div>
        <Link
          href="/mypage"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          マイページに戻る
        </Link>
      </div>

      <TemplateEditor
        initialItems={items.map((t) => ({
          id: t.id,
          name: t.name,
          body: t.body,
          sortOrder: t.sortOrder,
        }))}
      />
    </div>
  )
}
