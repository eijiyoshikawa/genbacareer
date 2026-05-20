import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const { jobId } = await params

  await prisma.favorite
    .delete({
      where: {
        userId_jobId: {
          userId: session.user.id,
          jobId,
        },
      },
    })
    .catch(() => null)

  return Response.json({ success: true })
}
