import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateResumeHtml } from "@/lib/resume-html"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const resume = await prisma.resume.findUnique({
    where: { userId: session.user.id },
  })

  if (!resume) {
    return Response.json({ error: "履歴書データがありません。先に保存してください。" }, { status: 404 })
  }

  const html = generateResumeHtml(resume)

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  })
}
