import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { isGuestBlockedFromJob } from "@/lib/guest-job-access"
import { type NextRequest } from "next/server"

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

  // 未登録ゲストは「グローバル上位 15 件」以外の詳細を API 経由でも取得できない
  // ようにする（/jobs/[id] ページと同じ基準。ここが漏れるとスクレイピングで
  // 登録ゲートを完全に迂回できてしまう）。
  const session = await auth().catch(() => null)
  const blocked = await isGuestBlockedFromJob({
    hasSession: !!session?.user?.id,
    userAgent: request.headers.get("user-agent"),
    jobId: id,
  })
  if (blocked) {
    return Response.json(
      { error: "この求人の詳細を見るには会員登録・ログインが必要です" },
      { status: 403 }
    )
  }

  // viewCount はここでは増やさない。以前はここでも無条件に increment して
  // おり、bot 判定も重複抑制も無いまま検索ランキングに使われる viewCount を
  // 誰でも `GET /api/jobs/{id}` を連打するだけで水増しできてしまっていた
  // （60 req/min のレート制限だけでは日次で数万回の水増しを防げない）。
  // 閲覧記録は <JobViewBeacon /> 経由の recordJobView() に一本化済み。

  return Response.json(job)
}
