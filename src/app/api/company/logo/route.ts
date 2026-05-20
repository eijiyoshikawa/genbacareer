import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  STORAGE_CONFIGURED,
  StorageError,
  uploadObject,
  validateImageFile,
} from "@/lib/storage"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json(
      { error: "企業アカウントでログインしてください" },
      { status: 403 }
    )
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json(
      { error: "企業情報が見つかりません" },
      { status: 403 }
    )
  }

  if (!STORAGE_CONFIGURED) {
    return Response.json(
      { error: "ファイルアップロードが利用できません" },
      { status: 503 }
    )
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const file = form.get("file")
  if (!(file instanceof File)) {
    return Response.json(
      { error: "ファイルが指定されていません" },
      { status: 400 }
    )
  }

  const err = validateImageFile(file)
  if (err) return Response.json({ error: err }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png"
  const key = `logos/${companyId}/${Date.now()}.${ext}`

  try {
    const url = await uploadObject({
      key,
      body: await file.arrayBuffer(),
      contentType: file.type,
    })
    await prisma.company.update({
      where: { id: companyId },
      data: { logoUrl: url },
    })
    return Response.json({ logoUrl: url })
  } catch (e) {
    if (e instanceof StorageError) {
      return Response.json({ error: e.message }, { status: e.status })
    }
    console.error("[logo-upload]", e)
    return Response.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    )
  }
}
