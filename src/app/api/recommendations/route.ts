/**
 * GET /api/recommendations
 *
 * 「あなたへのおすすめ求人」のクライアント取得用 API。
 *
 * - ログイン中: userId からシグナル集約
 * - 未ログイン: Cookie の gc_sid 経由で匿名 JobView をシグナルにする
 * - シグナルゼロ: グローバル rankScore 順
 *
 * トップページの ISR キャッシュを壊さないため、トップ側からはこの API を
 * クライアント fetch で叩いて差し替える。
 */

import { auth } from "@/lib/auth"
import { getSessionIdIfExists } from "@/lib/session-id"
import { getRecommendedJobs } from "@/lib/job-recommendations"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  // スクレイピング対策: 1 IP あたり 30 リクエスト/分
  const rl = checkRateLimit({
    key: `recommendations:${getClientIp(request)}`,
    limit: 30,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const limitParam = request.nextUrl.searchParams.get("limit")
  const limit = Math.min(12, Math.max(1, Number(limitParam ?? 6) || 6))

  const session = await auth().catch(() => null)
  const userId = session?.user?.id ?? null
  const sessionId = userId ? null : await getSessionIdIfExists().catch(() => null)

  const jobs = await getRecommendedJobs({ userId, sessionId }, limit)
  return Response.json(
    { jobs, personalized: !!(userId || sessionId) },
    { headers: { "cache-control": "private, max-age=60" } }
  )
}
