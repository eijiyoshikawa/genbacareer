import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 求人詳細 API は 1 分 60 リクエスト / IP（スクレイピング対策）
  const rl = checkRateLimit({
    key: `job-detail:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const { id } = await params

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          prefecture: true,
          city: true,
          address: true,
          employeeCount: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
        },
      },
    },
  })

  if (!job) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  // draft / closed は一般公開しない。求人の所有企業本人 / admin のみ閲覧可能。
  // （UUID を知っていれば誰でも見えてしまう IDOR を防ぐ。公開 URL の共有は
  //   previewToken 経由の /jobs/preview/[token] を使うこと）
  if (job.status !== "active") {
    const session = await auth()
    const role = (session?.user as { role?: string } | undefined)?.role
    const sessionCompanyId = (session?.user as { companyId?: string } | undefined)
      ?.companyId
    const isOwner =
      (role === "company_admin" || role === "company_member") &&
      sessionCompanyId &&
      sessionCompanyId === job.companyId
    const isAdmin = role === "admin"
    if (!isOwner && !isAdmin) {
      return Response.json({ error: "求人が見つかりません" }, { status: 404 })
    }
  }

  // 閲覧数をインクリメント（非同期、レスポンスをブロックしない）
  prisma.job
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {})

  return Response.json(job)
}
