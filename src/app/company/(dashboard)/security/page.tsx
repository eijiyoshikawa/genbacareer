import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { Shield } from "lucide-react"
import { TotpPanel } from "./totp-panel"

export const metadata: Metadata = {
  title: "セキュリティ設定",
  robots: { index: false, follow: false },
}

export default async function CompanySecurityPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    redirect("/login")
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) redirect("/login")

  const user = await prisma.companyUser
    .findUnique({
      where: { id: userId },
      select: {
        email: true,
        totpEnabled: true,
        totpEnabledAt: true,
        totpRecoveryCodes: true,
      },
    })
    .catch(() => null)
  if (!user) redirect("/login")

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Shield className="h-6 w-6 text-primary-500" />
        セキュリティ設定
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        請求情報や応募者の個人情報を扱うため、2 段階認証 (TOTP) の有効化を推奨します。
      </p>

      <div className="mt-6 max-w-2xl">
        <TotpPanel
          email={user.email}
          enabled={user.totpEnabled}
          enabledAt={user.totpEnabledAt ? user.totpEnabledAt.toISOString() : null}
          recoveryCodesRemaining={user.totpRecoveryCodes.length}
        />
      </div>
    </div>
  )
}
