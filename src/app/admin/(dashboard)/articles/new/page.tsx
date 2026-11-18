import { requireAdminPage } from "@/lib/admin-page-auth"
import type { Metadata } from "next"
import { ArticleForm, emptyArticleForm } from "@/components/admin/article-form"

export const metadata: Metadata = {
  title: "記事を追加",
}

export default async function AdminArticleNewPage() {
  await requireAdminPage()
  return <ArticleForm mode="create" initialValues={emptyArticleForm} />
}
