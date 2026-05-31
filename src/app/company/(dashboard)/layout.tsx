import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { CompanySidebar } from "@/components/company/sidebar"
import { CompanyStatusBanner } from "@/components/company/status-banner"
import { prisma } from "@/lib/db"

// /company 配下は全て認証必須。build 時 prerender を回避。
export const dynamic = "force-dynamic"

export default async function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session?.user) redirect("/company/login")

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    redirect("/company/login")
  }

  const userId = (session.user as { id?: string }).id
  const companyId = (session.user as { companyId?: string }).companyId ?? ""

  // PW 変更必須チェックと企業ステータス取得を並列実行
  const [cu, company] = await Promise.all([
    userId
      ? prisma.companyUser.findUnique({
          where: { id: userId },
          select: { mustChangePassword: true },
        })
      : Promise.resolve(null),
    companyId
      ? prisma.company.findUnique({
          where: { id: companyId },
          select: { status: true, rejectionReason: true },
        })
      : Promise.resolve(null),
  ])

  // 直接発行された企業ユーザーは初回 PW 変更を完了するまでダッシュボードに入れない
  if (cu?.mustChangePassword) {
    redirect("/company/change-password")
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6 lg:flex-row">
        <CompanySidebar
          companyId={companyId}
          userName={session.user.name ?? "担当者"}
          role={role}
        />
        <div className="flex-1 min-w-0">
          {company && company.status !== "approved" && (
            <CompanyStatusBanner
              status={company.status}
              rejectionReason={company.rejectionReason}
            />
          )}
          {children}
        </div>
      </div>
    </div>
  )
}
