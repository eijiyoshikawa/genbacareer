import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { JobWizard } from "@/components/company/job-wizard"
import { GbizReminderBanner } from "@/components/company/gbiz-reminder-banner"
import { loadActiveJobTemplates } from "@/lib/job-templates"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "新規求人作成",
}

export default async function NewJobPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const [templates, company] = await Promise.all([
    loadActiveJobTemplates(),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { corporateNumber: true },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">新規求人作成</h1>
      <p className="mt-1 text-sm text-gray-500">
        4 ステップで入力。AI 提案と下書き自動保存に対応しています。
      </p>
      <div className="mt-4">
        <GbizReminderBanner
          corporateNumber={company?.corporateNumber ?? null}
          context="job-form"
        />
      </div>
      <div className="mt-6">
        <JobWizard companyId={companyId} templates={templates} />
      </div>
    </div>
  )
}
