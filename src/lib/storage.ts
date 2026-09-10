import { randomBytes } from "crypto"
import { createClient } from "@supabase/supabase-js"

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error("Supabase環境変数が設定されていません (NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)")
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

const BUCKET_NAME = "documents"
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
]

/**
 * 先頭バイト（magic bytes）でファイル形式を検証する。
 * file.type はクライアント側で偽装可能なため、サーバ側で実バイト列を確認する
 * （storage-images.ts の画像アップロードと同じ方針。こちらは元々未対応だった）。
 *
 * @returns 検出した形式の MIME (見つからなければ null)
 */
async function detectDocumentMime(file: File): Promise<string | null> {
  const buf = new Uint8Array(await file.slice(0, 8).arrayBuffer())
  // PDF: "%PDF-"
  if (
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  ) {
    return "application/pdf"
  }
  // DOCX (Office Open XML) は ZIP コンテナ。ローカルファイルヘッダ署名で判定。
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  }
  return null
}

export async function uploadFile(
  userId: string,
  file: File,
  fileType: "resume" | "cv" | "other"
): Promise<{ url: string; path: string }> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("ファイルサイズは10MB以下にしてください")
  }

  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new Error("PDF または Word (.docx) ファイルのみアップロード可能です")
  }

  const actualMime = await detectDocumentMime(file)
  if (!actualMime) {
    throw new Error(
      "ファイル形式を検出できません。PDF または Word (.docx) ファイルをアップロードしてください"
    )
  }
  if (actualMime !== file.type) {
    throw new Error(
      `ファイル形式の不一致を検出しました（申告: ${file.type}, 実体: ${actualMime}）`
    )
  }

  // 拡張子は実 MIME から決定する（client 申告のファイル名拡張子は信用しない）
  const ext = actualMime === "application/pdf" ? "pdf" : "docx"
  // Date.now() だけだとミリ秒精度の推測可能な値になり、userId が漏れた場合に
  // 履歴書 (氏名・住所・経歴等の PII) のパスを総当たりされ得る
  // （storage-images.ts の画像アップロードは元々ランダム要素付き）。
  // ランダムなトークンを必須の構成要素として加える。
  const path = `${userId}/${fileType}/${Date.now()}_${randomBytes(16).toString("hex")}.${ext}`

  const { error } = await getSupabaseClient().storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: actualMime,
      upsert: false,
    })

  if (error) {
    throw new Error(`アップロードに失敗しました: ${error.message}`)
  }

  const { data: urlData } = getSupabaseClient().storage
    .from(BUCKET_NAME)
    .getPublicUrl(path)

  return { url: urlData.publicUrl, path }
}

export async function deleteFile(path: string): Promise<void> {
  const { error } = await getSupabaseClient().storage
    .from(BUCKET_NAME)
    .remove([path])

  if (error) {
    console.error(`[storage] Failed to delete ${path}:`, error)
  }
}
