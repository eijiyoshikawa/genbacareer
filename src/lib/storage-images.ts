/**
 * 企業ロゴ・写真用の画像アップロードヘルパー。
 *
 * src/lib/storage.ts はドキュメント (PDF/DOCX) 用なので、画像専用に
 * 別バケット `company-media` を使う。public read 前提。
 */

import { createClient } from "@supabase/supabase-js"

const BUCKET_NAME = "company-media"
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB（写真）
const MIN_FILE_SIZE = 100 // 100 bytes 未満は壊れた画像 / 0 byte spam
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"] as const

/**
 * 先頭バイト（magic bytes）でファイル形式を検証する。
 * file.type はクライアント側で偽装可能なため、サーバ側で実バイト列を確認。
 *
 * @returns 検出した形式の MIME (見つからなければ null)
 */
async function detectImageMime(file: File): Promise<string | null> {
  const buf = new Uint8Array(await file.slice(0, 16).arrayBuffer())

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg"
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png"
  }
  // WebP: 'RIFF' .... 'WEBP'
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp"
  }
  return null
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      "Supabase 環境変数が未設定です (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)"
    )
  }
  return createClient(url, key)
}

export type ImageKind = "logo" | "photo"

export async function uploadCompanyImage(
  companyId: string,
  kind: ImageKind,
  file: File
): Promise<{ url: string; path: string }> {
  // 1) サイズ
  if (file.size < MIN_FILE_SIZE) {
    throw new Error("ファイルが小さすぎます（壊れた画像 / 0 byte の可能性）")
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("ファイルサイズは 5MB 以下にしてください")
  }

  // 2) クライアントが申告した MIME（補助チェック）
  if (
    !(ALLOWED_MIME as readonly string[]).includes(file.type)
  ) {
    throw new Error("JPEG / PNG / WebP のみアップロード可能です")
  }

  // 3) Magic byte で実形式を確認（偽装防止）
  const actualMime = await detectImageMime(file)
  if (!actualMime) {
    throw new Error(
      "ファイル形式を検出できません。JPEG / PNG / WebP のいずれかをアップロードしてください"
    )
  }
  if (actualMime !== file.type) {
    throw new Error(
      `ファイル形式の不一致を検出しました（申告: ${file.type}, 実体: ${actualMime}）`
    )
  }

  // 4) 拡張子を実 MIME から決定（client 拡張子は信用しない）
  const safeExt =
    actualMime === "image/jpeg"
      ? "jpg"
      : actualMime === "image/png"
        ? "png"
        : "webp"
  const filename = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${safeExt}`
  const path = `${companyId}/${kind}/${filename}`

  const supabase = getClient()
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: actualMime, // 実 MIME を使う
      upsert: false,
    })
  if (error) {
    throw new Error(`アップロード失敗: ${error.message}`)
  }

  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path)
  return { url: data.publicUrl, path }
}

export async function deleteCompanyImage(path: string): Promise<void> {
  try {
    await getClient().storage.from(BUCKET_NAME).remove([path])
  } catch (e) {
    console.warn(
      `[storage-images] delete failed: ${e instanceof Error ? e.message : e}`
    )
  }
}

/**
 * Supabase の公開 URL からストレージ内パスを抽出。
 * 取得失敗・別ホスト URL の場合は null。
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    const m = url.match(/\/storage\/v1\/object\/public\/company-media\/(.+)$/)
    return m ? m[1] : null
  } catch {
    return null
  }
}
