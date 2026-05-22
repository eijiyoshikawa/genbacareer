import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminSidebar } from "@/components/admin/sidebar"

// /admin 配下は全て認証必須のため動的レンダリング固定。
// 一部の Prisma クエリが build 時に prerender されようとして
// DB スキーマ差分でビルドが落ちるのを防ぐ。
export const dynamic = "force-dynamic"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as { role?: string }).role
  if (role !== "admin") redirect("/")

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <AdminSidebar userName={session.user.name ?? "管理者"} />
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
