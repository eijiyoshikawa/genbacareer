import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { ChangePasswordForm } from "./form"

export const dynamic = "force-dynamic"

export default async function ChangePasswordPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    redirect("/")
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) redirect("/login")

  const user = await prisma.companyUser.findUnique({
    where: { id: userId },
    select: { mustChangePassword: true },
  })
  const forced = user?.mustChangePassword ?? false

  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6">
      <div className="border bg-white p-8 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">パスワード変更</h1>
        {forced && (
          <p className="mt-2 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            初回ログインのため、新しいパスワードへの変更が必要です。
          </p>
        )}
        <div className="mt-6">
          <ChangePasswordForm forced={forced} />
        </div>
      </div>
    </div>
  )
}
