import type { Metadata } from "next"
import { ArticleForm, emptyArticleForm } from "@/components/admin/article-form"

export const metadata: Metadata = {
  title: "記事を追加",
}

export default function AdminArticleNewPage() {
  return <ArticleForm mode="create" initialValues={emptyArticleForm} />
}
