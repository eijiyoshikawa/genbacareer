import { PrismaClient } from "@prisma/client"
import { readFileSync, existsSync } from "node:fs"
import { join, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { articlePlans } from "./article-plans"

const prisma = new PrismaClient()

const __dirname = dirname(fileURLToPath(import.meta.url))
const ARTICLES_DIR = join(__dirname, "articles")

/**
 * 199 件のマガジン記事を DB に upsert するシードスクリプト。
 *
 * 本文の優先順位:
 *   1. prisma/seed-data/articles/<slug>.html があればそれを使用（実コンテンツ）
 *   2. なければ generatePlaceholderBody() の仮本文
 *
 * upsert なので、HTML ファイルを追加してから再実行すると既存記事の body が
 * 実コンテンツに差し変わる（title/excerpt/category/tags なども更新）。
 *
 * 公開日は 2026/1/1 から 1 日 1 記事のペースで採番。
 */
async function seedArticles() {
  const startDate = new Date("2026-01-01T09:00:00+09:00")

  let real = 0
  let placeholder = 0

  for (let i = 0; i < articlePlans.length; i++) {
    const plan = articlePlans[i]
    const publishedAt = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)

    const htmlPath = join(ARTICLES_DIR, `${plan.slug}.html`)
    const hasRealContent = existsSync(htmlPath)
    const body = hasRealContent
      ? readFileSync(htmlPath, "utf-8").trim()
      : generatePlaceholderBody(plan.title, plan.excerpt, plan.tags)

    if (hasRealContent) real++
    else placeholder++

    await prisma.article.upsert({
      where: { slug: plan.slug },
      create: {
        slug: plan.slug,
        title: plan.title,
        excerpt: plan.excerpt,
        body,
        category: plan.category,
        tags: plan.tags,
        metaDescription: plan.excerpt,
        imageUrl: plan.imageUrl ?? null,
        authorName: "建設求人ポータル編集部",
        status: "published",
        featured: i < 3, // 最初の 3 記事を featured
        publishedAt,
      },
      update: {
        title: plan.title,
        excerpt: plan.excerpt,
        body,
        category: plan.category,
        tags: plan.tags,
        metaDescription: plan.excerpt,
        ...(plan.imageUrl ? { imageUrl: plan.imageUrl } : {}),
        // featured / publishedAt は既存値を尊重
      },
    })
  }

  console.log(
    `Articles seed complete: ${real} real content / ${placeholder} placeholder / ${articlePlans.length} total`
  )
}

function generatePlaceholderBody(
  title: string,
  excerpt: string,
  tags: string[]
): string {
  return `
<p>${excerpt}</p>

<h2>${title.split("—")[0].trim()}について</h2>
<p>この記事では、${tags.join("・")}に関する情報を詳しく解説します。建設業界で働く方やこれから転職を検討している方に向けて、実践的な内容をまとめました。</p>

<h2>まとめ</h2>
<p>建設業界は人手不足が続いており、未経験者の方にもチャンスがある業界です。資格取得や経験を積むことで着実にキャリアアップが可能です。</p>
<p>建設求人ポータルでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>
`.trim()
}

seedArticles()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
