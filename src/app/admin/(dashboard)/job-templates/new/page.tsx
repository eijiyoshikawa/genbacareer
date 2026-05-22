import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import { TemplateForm } from "../template-form"

export const metadata: Metadata = {
  title: "新規テンプレート作成",
  robots: { index: false, follow: false },
}

export default async function NewTemplatePage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") redirect("/login")

  return (
    <div className="space-y-4">
      <Link
        href="/admin/job-templates"
        className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        テンプレート一覧へ
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">新規テンプレート</h1>
      <TemplateForm />
    </div>
  )
}
