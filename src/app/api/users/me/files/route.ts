import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const files = await prisma.uploadedFile.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return Response.json({ files })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const formData = await request.formData()
  const file = formData.get("file") as File | null
  const fileType = (formData.get("fileType") as string) || "other"

  if (!file) {
    return Response.json({ error: "ファイルが選択されていません" }, { status: 400 })
  }

  if (!["resume", "cv", "other"].includes(fileType)) {
    return Response.json({ error: "無効なファイルタイプです" }, { status: 400 })
  }

  try {
    const { uploadFile } = await import("@/lib/storage")
    const { url } = await uploadFile(
      session.user.id,
      file,
      fileType as "resume" | "cv" | "other"
    )

    const uploaded = await prisma.uploadedFile.create({
      data: {
        userId: session.user.id,
        fileName: file.name,
        fileType,
        fileUrl: url,
        fileSize: file.size,
        mimeType: file.type,
      },
    })

    return Response.json({ file: uploaded }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : "アップロードに失敗しました"
    return Response.json({ error: message }, { status: 400 })
  }
}
