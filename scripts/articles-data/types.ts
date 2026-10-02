// 100 記事 seed 用の共通型定義。
// 各 batch ファイルは ArticleSeed[] を default export する。

export type ArticleSeed = {
  slug: string
  title: string
  excerpt: string
  body: string                         // HTML（&lt; などのエンティティを含む状態で OK。seed スクリプト側で decode する）
  category: "career" | "salary" | "license" | "job-type" | "industry" | "interview"
  subcategory: string | null
  tags: string[]
  metaDescription: string
  publishedAt: Date
}
