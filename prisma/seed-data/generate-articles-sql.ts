/**
 * 200記事プレースホルダー用の SQL INSERT 文を生成する。
 *
 * 用途:
 * - `articlePlans` の企画データから、articles テーブルへの INSERT 文を生成
 * - 生成された SQL を Supabase SQL Editor にコピペして一括投入する
 * - Vercel Functions のタイムアウトを完全に回避
 *
 * 実行方法:
 *   pnpm tsx prisma/seed-data/generate-articles-sql.ts > articles.sql
 *
 * 生成される SQL:
 * - 既存 slug があればスキップ（ON CONFLICT DO NOTHING）
 * - status = 'published'
 * - publishedAt = 2026/1/1 + (index日) のペースで設定
 * - 本文はプレースホルダー HTML
 * - 先頭3記事のみ featured = true
 */

import { articlePlans } from "./article-plans"

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
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。あなたに合った求人を探してみてください。</p>
`.trim()
}

/**
 * PostgreSQL の文字列リテラルをエスケープする。
 * シングルクォートを '' に変換するだけでよい。
 */
function escapeSqlString(s: string): string {
  return s.replace(/'/g, "''")
}

/**
 * PostgreSQL の text[] リテラルに変換する。
 * 例: ["a", "b"] → ARRAY['a','b']::text[]
 */
function toPgTextArray(arr: string[]): string {
  if (arr.length === 0) return "ARRAY[]::text[]"
  const escaped = arr.map((item) => `'${escapeSqlString(item)}'`).join(",")
  return `ARRAY[${escaped}]::text[]`
}

function main() {
  const startDate = new Date("2026-01-01T09:00:00+09:00")
  const dayMs = 24 * 60 * 60 * 1000

  const lines: string[] = []

  // --- ヘッダー ---
  lines.push("-- ============================================================")
  lines.push(`-- ゲンバキャリア: ${articlePlans.length} 記事プレースホルダー投入 SQL`)
  lines.push(`-- 生成日時: ${new Date().toISOString()}`)
  lines.push(
    "-- 使い方: この SQL を Supabase ダッシュボード → SQL Editor で実行"
  )
  lines.push(
    "-- 既存の slug は ON CONFLICT DO NOTHING でスキップされるので安全"
  )
  lines.push("-- ============================================================")
  lines.push("")
  lines.push("BEGIN;")
  lines.push("")

  articlePlans.forEach((plan, index) => {
    const publishedAt = new Date(startDate.getTime() + index * dayMs)
    const body = generatePlaceholderBody(plan.title, plan.excerpt, plan.tags)
    const featured = index < 3 // 先頭3記事を featured

    const values = [
      `gen_random_uuid()`,
      `'${escapeSqlString(plan.slug)}'`,
      `'${escapeSqlString(plan.title)}'`,
      `'${escapeSqlString(plan.excerpt)}'`,
      `'${escapeSqlString(body)}'`,
      `'${escapeSqlString(plan.category)}'`,
      toPgTextArray(plan.tags),
      `NULL`, // imageUrl
      `'${escapeSqlString(plan.excerpt)}'`, // metaDescription
      `'ゲンバキャリア編集部'`,
      `'published'`,
      featured ? "TRUE" : "FALSE",
      `0`, // viewCount
      `'${publishedAt.toISOString()}'`,
      `NOW()`,
      `NOW()`,
    ].join(", ")

    lines.push(
      `INSERT INTO articles (id, slug, title, excerpt, body, category, tags, image_url, meta_description, author_name, status, featured, view_count, published_at, created_at, updated_at) VALUES (${values}) ON CONFLICT (slug) DO NOTHING;`
    )
  })

  lines.push("")
  lines.push("COMMIT;")
  lines.push("")
  lines.push(
    `-- 完了: ${articlePlans.length} 記事の INSERT 文を生成しました`
  )

  console.log(lines.join("\n"))
}

main()
