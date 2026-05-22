import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { ArticleForm, type ArticleFormValues } from "@/components/admin/article-form"

export const metadata: Metadata = {
  title: "記事を編集",
}

function toLocalDatetimeInput(date: Date | null): string {
  if (!date) return ""
  // datetime-local input expects "YYYY-MM-DDTHH:mm"
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const article = await prisma.article.findUnique({ where: { id } })
  if (!article) notFound()

  const initialValues: ArticleFormValues = {
    slug: article.slug,
    title: article.title,
    excerpt: article.excerpt ?? "",
    body: article.body,
    category: article.category,
    tags: article.tags.join(", "),
    imageUrl: article.imageUrl ?? "",
    metaDescription: article.metaDescription ?? "",
    authorName: article.authorName,
    status: article.status as "draft" | "published",
    featured: article.featured,
    publishedAt: toLocalDatetimeInput(article.publishedAt),
  }

  return <ArticleForm mode="edit" articleId={id} initialValues={initialValues} />
}
