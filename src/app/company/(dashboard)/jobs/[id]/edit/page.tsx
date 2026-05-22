import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import { JobWizard } from "@/components/company/job-wizard"
import { PreviewUrlPanel } from "@/components/company/preview-url-panel"
import { loadActiveJobTemplates } from "@/lib/job-templates"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "求人編集",
}

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const { id } = await params

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      companyId: true,
      title: true,
      category: true,
      subcategory: true,
      employmentType: true,
      description: true,
      requirements: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      prefecture: true,
      city: true,
      address: true,
      benefits: true,
      tags: true,
      videoUrls: true,
      status: true,
      previewToken: true,
    },
  })

  if (!job || job.companyId !== companyId) notFound()

  const templates = await loadActiveJobTemplates()

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">求人編集</h1>
      <div className="mt-4">
        <PreviewUrlPanel jobId={job.id} initialToken={job.previewToken} />
      </div>
      <div className="mt-6">
        <JobWizard
          companyId={companyId}
          initialData={job}
          templates={templates}
        />
      </div>
    </div>
  )
}
