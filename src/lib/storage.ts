/**
 * Supabase Storage REST API ラッパ（SDK 不要）。
 *
 * 必要な環境変数:
 *   - SUPABASE_URL                例: https://xxxx.supabase.co
 *   - SUPABASE_SERVICE_ROLE_KEY   サーバー側からのみ利用
 *   - SUPABASE_STORAGE_BUCKET     例: uploads
 *
 * バケットは予め Supabase ダッシュボードで作成しておく必要がある。
 * 公開バケット(public)を前提に、アップロード後は公開URLを返す。
 */

export const STORAGE_CONFIGURED = Boolean(
  process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.SUPABASE_STORAGE_BUCKET
)

function endpoint(path: string) {
  return `${process.env.SUPABASE_URL}/storage/v1/${path}`
}

function authHeader(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    apikey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  }
}

export class StorageError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * バケットに blob をアップロードし、公開 URL を返す。
 * upsert=true なので同一キーへの再アップロードで上書きされる。
 */
export async function uploadObject(params: {
  key: string
  body: Blob | ArrayBuffer | Uint8Array
  contentType: string
}): Promise<string> {
  if (!STORAGE_CONFIGURED) {
    throw new StorageError("ファイルストレージが未設定です", 503)
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET as string
  const url = endpoint(`object/${bucket}/${params.key}`)

  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...authHeader(),
      "Content-Type": params.contentType,
      "x-upsert": "true",
    },
    body: params.body as BodyInit,
  })

  if (!res.ok) {
    const text = await res.text()
    throw new StorageError(
      `Upload failed: ${res.status} ${text}`,
      res.status
    )
  }

  return `${process.env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${params.key}`
}

export async function deleteObject(key: string): Promise<void> {
  if (!STORAGE_CONFIGURED) return
  const bucket = process.env.SUPABASE_STORAGE_BUCKET as string
  await fetch(endpoint(`object/${bucket}/${key}`), {
    method: "DELETE",
    headers: authHeader(),
  }).catch((err) => console.error("[storage] delete failed:", err))
}

const ALLOWED_RESUME_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
])

const ALLOWED_IMAGE_MIME = new Set(["image/jpeg", "image/png", "image/webp"])

const MAX_RESUME_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_IMAGE_BYTES = 2 * 1024 * 1024 // 2MB

export function validateResumeFile(file: File): string | null {
  if (!ALLOWED_RESUME_MIME.has(file.type)) {
    return "PDF / JPEG / PNG のみアップロード可能です"
  }
  if (file.size > MAX_RESUME_BYTES) {
    return "ファイルサイズは 5MB 以下にしてください"
  }
  return null
}

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_MIME.has(file.type)) {
    return "JPEG / PNG / WebP のみアップロード可能です"
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "ファイルサイズは 2MB 以下にしてください"
  }
  return null
}
