import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { type NextRequest } from "next/server"

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

  // 不正な id は Prisma の UUID 変換で 500 になるため先に弾く
  if (!UUID_RE.test(id)) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  // 公開 API なので掲載中 (active) のみ返し、社内向けフィールドは除外する
  // (hiringFeeAmount = 個別成功報酬額, previewToken = 下書きプレビュー鍵 等)
  const job = await prisma.job.findFirst({
    where: { id, status: "active" },
    omit: {
      hiringFeeAmount: true,
      previewToken: true,
      rawData: true,
      dedupeKey: true,
      dedupedTo: true,
      rankScore: true,
    },
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

  // 閲覧数をインクリメント（非同期、レスポンスをブロックしない）
  prisma.job
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {})

  return Response.json(job)
}
