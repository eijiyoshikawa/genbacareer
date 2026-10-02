/**
 * scripts/insert-article-images.ts
 *
 * 公開中の全マガジン記事に対し、
 *   - ヒーロー画像 (imageUrl) を新しい写真に差し替え
 *   - 本文 (body) の冒頭と中盤に画像を2枚差し込み
 * を行う。画像は Supabase Storage の company-media/articles/ をプールとして
 * 全体ローテーションで割り当てる（src/lib/article-images.ts）。
 *
 * 安全機構:
 *   - dry-run がデフォルト（--apply で実適用）
 *   - 改稿前を ArticleRevision (source='image-insert') に退避 → ロールバック可
 *   - 本文に挿入マーカー(data-auto-img)がある記事はスキップ（冪等・二重挿入防止）
 *   - 100 件バッチ + 接続断リトライ
 *
 * 事前に scripts/upload-article-images.ts でアップロード済みであること。
 *
 * 実行:
 *   pnpm tsx --env-file=.env.local scripts/insert-article-images.ts            # dry-run
 *   pnpm tsx --env-file=.env.local scripts/insert-article-images.ts --apply    # 実適用
 *
 * オプション:
 *   --no-hero     ヒーロー画像は差し替えず、本文2枚のみ
 *   --reassign    既に挿入済みの記事も対象にし、旧画像を消して入れ直す（組み替え）
 *   --seed=N      画像プールのシャッフル seed（既定 42。変えると別の組み合わせ）
 */

import { createClient } from "@supabase/supabase-js"
import { prisma } from "@/lib/db"
import {
  assignImages,
  insertImagesIntoBody,
  hasAutoImages,
  stripAutoImages,
  shuffleWithSeed,
} from "@/lib/article-images"

const BUCKET = "company-media"
const PREFIX = "articles"

const apply = process.argv.includes("--apply")
const noHero = process.argv.includes("--no-hero")
const reassign = process.argv.includes("--reassign")
const seedArg = process.argv.find((a) => a.startsWith("--seed="))
const seed = seedArg ? Number(seedArg.split("=")[1]) : 42

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [1_000, 2_000, 5_000, 10_000]
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (e) {
      const code = (e as { code?: string }).code
      const retryable =
        code === "P1017" ||
        code === "P2028" ||
        code === "P1001" ||
        (e instanceof Error && /closed the connection/i.test(e.message))
      if (!retryable || attempt === delays.length) throw e
      const wait = delays[attempt]
      console.warn(`  ⚠️  ${label} 接続エラー(${code ?? "?"}) → ${wait}ms 後リトライ`)
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw new Error("unreachable")
}

function storage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "環境変数が未設定です (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    )
  }
  return createClient(url, key)
}

/** company-media/articles/ 配下の画像を public URL のプールとして取得。 */
async function loadImagePool(): Promise<string[]> {
  const supabase = storage()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list(PREFIX, { limit: 1000, sortBy: { column: "name", order: "asc" } })
  if (error) throw new Error(`storage.list 失敗: ${error.message}`)
  const imgRe = /\.(jpe?g|png|webp)$/i
  return (data ?? [])
    .filter((f) => imgRe.test(f.name))
    .map(
      (f) =>
        supabase.storage.from(BUCKET).getPublicUrl(`${PREFIX}/${f.name}`).data
          .publicUrl
    )
}

async function main(): Promise<void> {
  console.log(
    apply
      ? "🔴 APPLY MODE: 記事の imageUrl / body を更新します"
      : "🟡 DRY-RUN MODE: 計画のみ表示（--apply で実適用）"
  )
  console.log(noHero ? "  ヒーロー画像: 差し替えない（本文2枚のみ）" : "  ヒーロー画像: 差し替える")
  console.log(reassign ? "  モード: 再割当（既存の画像を組み替える）" : "  モード: 新規挿入のみ")
  console.log(`  シャッフル seed: ${seed}`)

  // 連番の連写写真が1記事に固まらないよう、プールをシャッフルしてから割り当てる
  const pool = shuffleWithSeed(await loadImagePool(), seed)
  console.log(`  画像プール: ${pool.length} 枚`)
  if (pool.length === 0) {
    console.error(
      "❌ 画像が0枚です。先に upload-article-images.ts でアップロードしてください"
    )
    process.exit(1)
  }
  if (pool.length < 3) {
    console.warn("  ⚠️ プールが3枚未満です。記事内で画像が重複します")
  }

  const articles = await withRetry(
    () =>
      prisma.article.findMany({
        where: { status: "published" },
        orderBy: { id: "asc" },
        select: { id: true, slug: true, title: true, body: true, imageUrl: true },
      }),
    "findMany"
  )
  console.log(`  公開記事: ${articles.length} 件\n`)

  const assign = assignImages(
    articles.map((a) => a.id),
    pool
  )

  let planned = 0
  let skipped = 0
  const updates: Array<{
    id: string
    title: string
    body: string
    imageUrl: string | null
    oldBody: string
    oldImageUrl: string | null
  }> = []

  for (const a of articles) {
    const alreadyHasImages = hasAutoImages(a.body)
    if (alreadyHasImages && !reassign) {
      skipped++
      continue // 冪等: 既に挿入済み（再割当モードでなければスキップ）
    }
    const imgs = assign.get(a.id)
    if (!imgs) continue
    // 再割当時は既存の自動画像を除去してから入れ直す
    const baseBody = alreadyHasImages ? stripAutoImages(a.body) : a.body
    const newBody = insertImagesIntoBody(baseBody, [
      { url: imgs.body[0], alt: a.title },
      { url: imgs.body[1], alt: a.title },
    ])
    const newImageUrl = noHero ? a.imageUrl : imgs.hero
    updates.push({
      id: a.id,
      title: a.title,
      body: newBody,
      imageUrl: newImageUrl,
      oldBody: a.body,
      oldImageUrl: a.imageUrl,
    })
    planned++
  }

  console.log("============================================================")
  console.log(`  挿入対象: ${planned} 件 / スキップ(挿入済み): ${skipped} 件`)
  console.log("============================================================")
  console.log("\n  例（先頭5件）:")
  for (const u of updates.slice(0, 5)) {
    console.log(`    - ${u.title.slice(0, 40)}`)
    if (!noHero) console.log(`        hero: ${u.oldImageUrl ?? "(なし)"} → ${u.imageUrl}`)
  }

  if (!apply) {
    console.log("\n⚠️  問題なければ --apply を付けて再実行してください")
    return
  }

  let done = 0
  for (let i = 0; i < updates.length; i += 100) {
    const chunk = updates.slice(i, i + 100)
    await withRetry(
      () =>
        prisma.$transaction(
          chunk.flatMap((u) => [
            prisma.articleRevision.create({
              data: {
                articleId: u.id,
                title: u.title,
                body: u.oldBody,
                source: reassign ? "image-reassign" : "image-insert",
                // ArticleRevision に imageUrl 列が無いため、ロールバック用に
                // 旧ヒーローURLを reason に退避（body は revision.body から復元可能）
                reason: `${reassign ? "画像組み替え" : "ヒーロー差替+本文2枚"}; oldHero=${u.oldImageUrl ?? ""}`.slice(
                  0,
                  500
                ),
              },
            }),
            prisma.article.update({
              where: { id: u.id },
              data: { body: u.body, imageUrl: u.imageUrl },
            }),
          ])
        ),
      `flush(${chunk.length})`
    )
    done += chunk.length
    process.stdout.write(`\r  更新済み: ${done} / ${updates.length}`)
  }
  console.log(`\n\n✅ ${done} 件の記事に画像を挿入しました`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
