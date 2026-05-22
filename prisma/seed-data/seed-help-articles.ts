/**
 * ヘルプ記事の雛形シードスクリプト
 *
 * 使い方:
 *   pnpm tsx --env-file=.env.local prisma/seed-data/seed-help-articles.ts
 *
 * src/lib/help-articles.ts に定義された雛形記事を Article テーブルに upsert する。
 * 本文は仮テキストなので、投入後に管理画面 (/admin/articles) で実コンテンツに差し替えてください。
 *
 * カテゴリ:
 *   - help-seeker   求職者向け
 *   - help-employer 求人掲載側向け
 */

import { PrismaClient } from "@prisma/client"
import {
  SEEKER_HELP_SECTIONS,
  EMPLOYER_HELP_SECTIONS,
  helpCategory,
  type HelpArticleStub,
} from "../../src/lib/help-articles"

const prisma = new PrismaClient()

function placeholderBody(stub: HelpArticleStub): string {
  return `
<h2>${escapeHtml(stub.title)}</h2>
<p>${escapeHtml(stub.excerpt)}</p>

<h3>このページについて</h3>
<p>このページは雛形です。管理画面 (<code>/admin/articles</code>) から本文を編集してください。</p>

<h3>関連リンク</h3>
<ul>
  <li><a href="/help">ヘルプセンター</a></li>
  <li><a href="/contact">お問い合わせ</a></li>
</ul>
`.trim()
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

async function seedHelpArticles() {
  let upserted = 0
  const now = new Date()

  for (const audience of ["seeker", "employer"] as const) {
    const sections =
      audience === "seeker" ? SEEKER_HELP_SECTIONS : EMPLOYER_HELP_SECTIONS
    const category = helpCategory(audience)

    for (const section of sections) {
      for (const stub of section.articles) {
        await prisma.article.upsert({
          where: { slug: stub.slug },
          create: {
            slug: stub.slug,
            title: stub.title,
            excerpt: stub.excerpt,
            body: placeholderBody(stub),
            category,
            subcategory: stub.subcategory,
            tags: [],
            authorName: "ゲンバキャリア編集部",
            status: "published",
            publishedAt: now,
          },
          update: {
            // 既存の body はユーザー編集を優先するため上書きしない
            title: stub.title,
            excerpt: stub.excerpt,
            category,
            subcategory: stub.subcategory,
          },
        })
        upserted++
      }
    }
  }

  console.log(`✓ ${upserted} help articles upserted`)
}

seedHelpArticles()
  .catch((e) => {
    console.error("Unhandled error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
