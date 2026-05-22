/**
 * POST /api/company/media/upload
 *
 * 企業ロゴ or 写真のアップロード。FormData で受け取り、Supabase Storage に保存して
 * 公開 URL を返す。Company レコードへの反映は呼び出し側で行う。
 *
 * Body:
 *   - file: File
 *   - kind: "logo" | "photo"
 */

import { type NextRequest } from "next/server"
import { requireCompanyAuth, isCompanyAuthError } from "@/lib/company-auth"
import { uploadCompanyImage } from "@/lib/storage-images"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const ctx = await requireCompanyAuth({ requireApproved: false })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json(
      { error: "リクエスト形式が不正です（multipart/form-data 必須）" },
      { status: 400 }
    )
  }

  const file = form.get("file")
  const kindRaw = String(form.get("kind") ?? "")
  if (!(file instanceof File)) {
    return Response.json({ error: "ファイルが添付されていません" }, { status: 400 })
  }
  if (kindRaw !== "logo" && kindRaw !== "photo") {
    return Response.json(
      { error: "kind は 'logo' または 'photo' を指定してください" },
      { status: 400 }
    )
  }

  try {
    const { url, path } = await uploadCompanyImage(ctx.companyId, kindRaw, file)
    return Response.json({ url, path })
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "アップロードに失敗しました" },
      { status: 400 }
    )
  }
}
