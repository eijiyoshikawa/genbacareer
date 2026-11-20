import { requireAdminPage } from "@/lib/admin-page-auth"
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
  // サーバー (UTC) でも日本時間で組み立てる。getHours() 等だと UTC の時刻が入り、
  // ブラウザ側は JST として解釈するため、保存の度に公開日時が 9 時間ずつ前へずれていた。
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${jst.getUTCFullYear()}-${pad(jst.getUTCMonth() + 1)}-${pad(jst.getUTCDate())}T${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}`
}

export default async function AdminArticleEditPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requireAdminPage()
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
