/**
 * scripts/upload-default-job-images.ts
 *
 * メイン写真の無い求人に表示する「指定の 15 枚」を Supabase Storage
 * （company-media バケットの `job-defaults/` プレフィックス, public read）へ
 * アップロードし、公開 URL を src/lib/default-job-images.ts の
 * DEFAULT_JOB_IMAGES 配列へ自動反映する。
 *
 * 準備:
 *   1) 表示したい 15 枚を ./job-default-images/ に置く（jpg/png/webp）
 *      ※ 16 枚以上ある場合は先頭 15 枚（ファイル名昇順）を採用
 *      ※ アップロード時に 1920×1080 (16:9, 中央クロップ) の WebP へ自動正規化
 *
 * 実行:
 *   # dry-run（対象ファイル一覧のみ）
 *   pnpm tsx --env-file=.env.local scripts/upload-default-job-images.ts --dir=./job-default-images
 *
 *   # 実アップロード + lib への URL 反映
 *   pnpm tsx --env-file=.env.local scripts/upload-default-job-images.ts --dir=./job-default-images --apply --write
 *
 * 必要な環境変数: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import { extname, join } from "node:path"
import { createClient } from "@supabase/supabase-js"
import sharp from "sharp"

const BUCKET = "company-media"
const PREFIX = "job-defaults"
const MAX = 15
const LIB_PATH = "src/lib/default-job-images.ts"

// 出力サイズ（フルHD・16:9）。被写体が切れないよう中央クロップで cover。
const OUT_W = 1920
const OUT_H = 1080

const apply = process.argv.includes("--apply")
const write = process.argv.includes("--write")
const dirArg = process.argv.find((a) => a.startsWith("--dir="))
const dir = dirArg ? dirArg.split("=")[1] : "./job-default-images"

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

/** DEFAULT_JOB_IMAGES 配列を URL リストで丸ごと書き換える */
function writeLib(urls: string[]): void {
  const src = readFileSync(LIB_PATH, "utf8")
  const body = urls.map((u) => `  ${JSON.stringify(u)},`).join("\n")
  const next = src.replace(
    /export const DEFAULT_JOB_IMAGES: string\[\] = \[[\s\S]*?\]/,
    `export const DEFAULT_JOB_IMAGES: string[] = [\n${body}\n]`
  )
  if (next === src) {
    console.error("❌ default-job-images.ts の配列を見つけられませんでした")
    process.exit(1)
  }
  writeFileSync(LIB_PATH, next)
  console.log(`  📝 ${LIB_PATH} を更新（${urls.length} URL）`)
}

async function main(): Promise<void> {
  console.log(
    apply
      ? "🔴 APPLY MODE: Supabase Storage へアップロードします"
      : "🟡 DRY-RUN MODE: 対象ファイル一覧のみ（--apply で実アップロード）"
  )
  console.log(`  入力フォルダ: ${dir}`)

  if (!existsSync(dir)) {
    console.error(
      `❌ 入力フォルダが見つかりません: ${dir}\n` +
        `   先にフォルダを作成して画像を入れてください:\n` +
        `     mkdir -p ${dir}\n` +
        `     # ${dir}/ に表示したい画像を 15 枚コピー（jpg/png/webp）`
    )
    process.exit(1)
  }

  const files = readdirSync(dir)
    .filter((f) => MIME[extname(f).toLowerCase()])
    .sort()
    .slice(0, MAX)

  if (files.length === 0) {
    console.error(`❌ ${dir} に画像 (jpg/png/webp) が見つかりません`)
    process.exit(1)
  }
  console.log(`  画像: ${files.length} 枚（最大 ${MAX}）\n`)

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
    // 連番で固定名にして、再アップロード時も同じ URL を維持する。
    // 出力は常に 1920×1080 の WebP に正規化するため拡張子は .webp 固定。
    const dest = `${PREFIX}/${String(i + 1).padStart(2, "0")}.webp`

    if (!apply) {
      console.log(`  [dry-run] ${file}  →  ${BUCKET}/${dest}  (→ ${OUT_W}×${OUT_H} webp)`)
      continue
    }

    // 1920×1080 (16:9) へ中央クロップで cover、WebP 化
    const buf = await sharp(readFileSync(join(dir, file)))
      .rotate() // EXIF の向きを反映
      .resize(OUT_W, OUT_H, { fit: "cover", position: "centre" })
      .webp({ quality: 82 })
      .toBuffer()
    const { error } = await supabase!.storage
      .from(BUCKET)
      .upload(dest, buf, { contentType: "image/webp", upsert: true })
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
    if (write) {
      writeLib(urls)
    } else {
      console.log("\n以下を src/lib/default-job-images.ts の DEFAULT_JOB_IMAGES に設定してください:")
      console.log(urls.map((u) => `  ${JSON.stringify(u)},`).join("\n"))
      console.log("\n（--write を付ければ自動で反映します）")
    }
  } else {
    console.log("\n⚠️  問題なければ --apply --write を付けて再実行してください")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
