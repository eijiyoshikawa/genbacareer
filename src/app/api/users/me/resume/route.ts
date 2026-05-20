import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  STORAGE_CONFIGURED,
  StorageError,
  uploadObject,
  validateResumeFile,
} from "@/lib/storage"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  if (!STORAGE_CONFIGURED) {
    return Response.json(
      { error: "ファイルアップロードが利用できません（管理者にお問い合わせください）" },
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
    return Response.json({ error: "ファイルが指定されていません" }, { status: 400 })
  }

  const err = validateResumeFile(file)
  if (err) return Response.json({ error: err }, { status: 400 })

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin"
  const key = `resumes/${session.user.id}/${Date.now()}.${ext}`

  try {
    const url = await uploadObject({
      key,
      body: await file.arrayBuffer(),
      contentType: file.type,
    })
    await prisma.user.update({
      where: { id: session.user.id },
      data: { resumeUrl: url },
    })
    return Response.json({ resumeUrl: url })
  } catch (e) {
    if (e instanceof StorageError) {
      return Response.json({ error: e.message }, { status: e.status })
    }
    console.error("[resume-upload]", e)
    return Response.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { resumeUrl: null },
  })

  return Response.json({ success: true })
}
