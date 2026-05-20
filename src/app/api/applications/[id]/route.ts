import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

/**
 * 応募の取り下げ（求職者側）。
 * 物理削除はせず、status=withdrawn にして履歴を残す。
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role && role !== "seeker") {
    return Response.json(
      { error: "求職者アカウントでログインしてください" },
      { status: 403 }
    )
  }

  const { id } = await params

  const application = await prisma.application.findUnique({
    where: { id },
    select: { userId: true, status: true },
  })

  if (!application || application.userId !== session.user.id) {
    return Response.json(
      { error: "応募が見つかりません" },
      { status: 404 }
    )
  }

  if (
    application.status === "withdrawn" ||
    application.status === "hired" ||
    application.status === "rejected"
  ) {
    return Response.json(
      { error: "この応募は取り下げできません" },
      { status: 400 }
    )
  }

  const updated = await prisma.application.update({
    where: { id },
    data: { status: "withdrawn", withdrawnAt: new Date() },
  })

  return Response.json({ application: updated })
}
