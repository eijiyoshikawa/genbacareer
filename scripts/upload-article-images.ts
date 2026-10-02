/**
 * scripts/upload-article-images.ts
 *
 * ローカルフォルダ内の画像を Supabase Storage（company-media バケットの
 * `articles/` プレフィックス, public read）へ一括アップロードする。
 *
 * 記事への差し込みは scripts/insert-article-images.ts が、このプレフィックスを
 * 走査してプールとして使う。
 *
 * 準備:
 *   1) Google Drive から画像をローカルにダウンロード
 *   2) 例: ./article-images/ フォルダに置く（jpg/png/webp）
 *
 * 実行:
 *   # dry-run（対象ファイル一覧のみ）
 *   pnpm tsx --env-file=.env.local scripts/upload-article-images.ts --dir=./article-images
 *
 *   # 実アップロード
 *   pnpm tsx --env-file=.env.local scripts/upload-article-images.ts --dir=./article-images --apply
 *
 * 必要な環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync, readdirSync } from "node:fs"
import { extname, join, basename } from "node:path"
import { createClient } from "@supabase/supabase-js"

const BUCKET = "company-media"
const PREFIX = "articles"

const apply = process.argv.includes("--apply")
const dirArg = process.argv.find((a) => a.startsWith("--dir="))
const dir = dirArg ? dirArg.split("=")[1] : "./article-images"

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "環境変数が未設定です (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    )
  }
  return createClient(url, key)
}

/** ファイル名を安全な形（英数・ハイフン）に寄せる。重複を避けるため index も付ける。 */
function safeName(file: string, idx: number): string {
  const ext = extname(file).toLowerCase()
  const stem = basename(file, extname(file))
    .normalize("NFKC")
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
  return `${String(idx + 1).padStart(3, "0")}-${stem || "img"}${ext}`
}

async function main(): Promise<void> {
  console.log(
    apply
      ? "🔴 APPLY MODE: Supabase Storage へアップロードします"
      : "🟡 DRY-RUN MODE: 対象ファイル一覧のみ（--apply で実アップロード）"
  )
  console.log(`  入力フォルダ: ${dir}`)

  const files = readdirSync(dir)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .sort()

  if (files.length === 0) {
    console.error(`❌ ${dir} に画像 (jpg/png/webp) が見つかりません`)
    process.exit(1)
  }
  console.log(`  画像: ${files.length} 枚\n`)

  const supabase = apply ? getClient() : null
  const urls: string[] = []

  // バケットが無ければ作成（public read）。既にあれば何もしない。
  if (apply && supabase) {
    const { data: buckets } = await supabase.storage.listBuckets()
    const exists = (buckets ?? []).some((b) => b.name === BUCKET)
    if (!exists) {
      const { error: createErr } = await supabase.storage.createBucket(BUCKET, {
        public: true,
      })
      if (createErr) {
        console.error(`❌ バケット作成失敗 (${BUCKET}): ${createErr.message}`)
        process.exit(1)
      }
      console.log(`  📦 バケット作成: ${BUCKET} (public)`)
    } else {
      console.log(`  📦 バケット確認: ${BUCKET} は既存`)
    }
  }

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = extname(file).toLowerCase()
    const dest = `${PREFIX}/${safeName(file, i)}`

    if (!apply) {
      console.log(`  [dry-run] ${file}  →  ${BUCKET}/${dest}`)
      continue
    }

    const buf = readFileSync(join(dir, file))
    const { error } = await supabase!.storage
      .from(BUCKET)
      .upload(dest, buf, { contentType: MIME[ext], upsert: true })
    if (error) {
      console.error(`  ❌ ${file}: ${error.message}`)
      continue
    }
    const { data } = supabase!.storage.from(BUCKET).getPublicUrl(dest)
    urls.push(data.publicUrl)
    console.log(`  ✅ ${file}  →  ${data.publicUrl}`)
  }

  if (apply) {
    console.log(`\n✅ ${urls.length} 枚アップロード完了`)
    console.log(
      "  次: pnpm tsx --env-file=.env.local scripts/insert-article-images.ts"
    )
  } else {
    console.log("\n⚠️  問題なければ --apply を付けて再実行してください")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
