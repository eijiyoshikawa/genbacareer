import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"

/**
 * expiresAt を過ぎた active 求人を closed に変える cron 用ルート。
 * Authorization: Bearer ${CRON_SECRET} を必須にする。
 */
export const dynamic = "force-dynamic"

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  return header === `Bearer ${secret}`
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const result = await prisma.job.updateMany({
    where: {
      status: "active",
      expiresAt: { lte: now, not: null },
    },
    data: { status: "closed" },
  })

  return Response.json({ closed: result.count })
}
