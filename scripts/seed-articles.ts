/**
 * scripts/seed-articles.ts
 *
 * ゲンバキャリアのマガジン記事を 100 件まとめて upsert する seed スクリプト。
 *
 * 実行方法:
 *   pnpm tsx --env-file=.env.local scripts/seed-articles.ts
 *
 * 冪等: slug をユニークキーに upsert するため、再実行で内容更新される。
 *
 * 記事データは scripts/articles-data/batch-NN-*.ts に分割保存している。
 * 各 batch ファイルは AI で生成済み（HTML エンティティを含む生データ）。
 * 本 script で `decodeEntities()` により実 HTML タグに変換してから DB へ投入する。
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

// .env.local を自前ロード（tsx は自動ロードしない）
function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = join(process.cwd(), file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq < 0) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (!process.env[k]) process.env[k] = v
    }
  }
}
loadDotEnv()

import { prisma } from "@/lib/db"
import type { ArticleSeed } from "./articles-data/types"
import { batch01 } from "./articles-data/batch-01-career-a"
import { batch02 } from "./articles-data/batch-02-salary-a"
import { batch03 } from "./articles-data/batch-03-license-a"
import { batch04 } from "./articles-data/batch-04-jobtype-a"
import { batch05 } from "./articles-data/batch-05-industry-interview"
import { batch06 } from "./articles-data/batch-06-career-b"
import { batch07 } from "./articles-data/batch-07-license-b"
import { batch08 } from "./articles-data/batch-08-jobtype-b"
import { batch09 } from "./articles-data/batch-09-industry-b"
import { batch10 } from "./articles-data/batch-10-salary-interview-b"
import { batch11 } from "./articles-data/batch-11-tokyo-jobs"
import { batch12 } from "./articles-data/batch-12-osaka-jobs"
import { batch13 } from "./articles-data/batch-13-fukuoka-jobs"

/**
 * AI 生成時に紛れ込んだ HTML エンティティを実タグに戻す。
 * 本文は <p>, <h2>, <ul>, <li>, <table>, <strong>, <blockquote> などを利用する想定。
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&") // & は最後に処理して二重デコードを避ける
}

const ALL_ARTICLES: ArticleSeed[] = [
  ...batch01,
  ...batch02,
  ...batch03,
  ...batch04,
  ...batch05,
  ...batch06,
  ...batch07,
  ...batch08,
  ...batch09,
  ...batch10,
  ...batch11,
  ...batch12,
  ...batch13,
]

async function main(): Promise<void> {
  console.log(`シード対象記事数: ${ALL_ARTICLES.length}`)

  // slug 重複チェック（AI 生成のため一応確認）
  const slugs = new Set<string>()
  for (const a of ALL_ARTICLES) {
    if (slugs.has(a.slug)) {
      throw new Error(`重複 slug: ${a.slug}`)
    }
    slugs.add(a.slug)
  }

  let created = 0
  let updated = 0
  for (const a of ALL_ARTICLES) {
    const data = {
      slug: a.slug,
      title: a.title,
      excerpt: decodeEntities(a.excerpt),
      body: decodeEntities(a.body),
      category: a.category,
      subcategory: a.subcategory,
      tags: a.tags,
      metaDescription: decodeEntities(a.metaDescription),
      authorName: "ゲンバキャリア編集部",
      status: "published" as const,
      featured: false,
      publishedAt: a.publishedAt,
    }
    const existing = await prisma.article.findUnique({ where: { slug: a.slug }, select: { id: true } })
    if (existing) {
      await prisma.article.update({ where: { slug: a.slug }, data })
      updated++
    } else {
      await prisma.article.create({ data })
      created++
    }
  }

  console.log(`完了: 新規 ${created} 件 / 更新 ${updated} 件 (計 ${created + updated} 件)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
