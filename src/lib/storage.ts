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

  const ext = file.name.split(".").pop() ?? "pdf"
  const path = `${userId}/${fileType}/${Date.now()}.${ext}`

  const { error } = await getSupabaseClient().storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType: file.type,
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
