import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import { TemplateForm } from "../template-form"

export const metadata: Metadata = {
  title: "テンプレート編集",
  robots: { index: false, follow: false },
}

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") redirect("/login")

  const { id } = await params
  const t = await prisma.jobTemplate
    .findUnique({ where: { id } })
    .catch(() => null)
  if (!t) notFound()

  return (
    <div className="space-y-4">
      <Link
        href="/admin/job-templates"
        className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        テンプレート一覧へ
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">
        テンプレート編集: {t.name}
      </h1>
      <TemplateForm
        initial={{
          id: t.id,
          slug: t.slug,
          name: t.name,
          category: t.category,
          description: t.description,
          requirements: t.requirements ?? "",
          benefits: t.benefits.join(", "),
          tags: t.tags.join(", "),
          salaryMin: t.salaryMin?.toString() ?? "",
          salaryMax: t.salaryMax?.toString() ?? "",
          hint: t.hint ?? "",
          sortOrder: String(t.sortOrder),
          isActive: t.isActive,
        }}
      />
    </div>
  )
}
