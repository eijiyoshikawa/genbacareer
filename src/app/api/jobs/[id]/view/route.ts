/**
 * POST /api/jobs/[id]/view
 *
 * クライアントから fire-and-forget で叩く JobView 記録 API。
 * SSR/ISR キャッシュを汚さないため、ページ本体は静的レンダリングのまま
 * 閲覧記録だけクライアント beacon で送る設計。
 *
 * - Bot UA / preview モードは skip
 * - 同一 sessionId + jobId は 5 分以内なら重複抑制（recordJobView 側）
 */

import { auth } from "@/lib/auth"
import { getSessionIdIfExists } from "@/lib/session-id"
import { recordJobView, extractUtmFromUrl } from "@/lib/tracking"
import { trackEvent } from "@/lib/track"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 異常高速閲覧の検出: 1 分 120 リクエスト / IP
  // ボット的なスクレイパーがビーコンを叩いて閲覧数を水増しするのも防ぐ
  const rl = checkRateLimit({
    key: `job-view:${getClientIp(request)}`,
    limit: 120,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const { id } = await params
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ ok: false }, { status: 400 })
  }

  // body から referrer / utm を取得（クライアントが知っている情報）
  let body: { referrer?: string; pageUrl?: string } = {}
  try {
    body = await request.json()
  } catch {
    // body 無しでも記録は試みる
  }

  const session = await auth().catch(() => null)
  const userId = session?.user?.id ?? null
  const sessionId = await getSessionIdIfExists().catch(() => null)

  const ua = request.headers.get("user-agent") ?? null
  // x-vercel-forwarded-for はクライアントが偽装できない（Vercel が上書きする）ため優先する。
  const xvf = request.headers.get("x-vercel-forwarded-for")
  const fwd = request.headers.get("x-forwarded-for")
  const ipAddress = xvf
    ? xvf.split(",")[0].trim()
    : fwd
      ? fwd.split(",")[0].trim()
      : null
  const referer = body.referrer ?? request.headers.get("referer") ?? null
  const utm = body.pageUrl
    ? extractUtmFromUrl(body.pageUrl)
    : { source: null, medium: null, campaign: null }

  await recordJobView({
    jobId: id,
    sessionId,
    userId,
    ipAddress,
    userAgent: ua,
    referer,
    utm,
  }).catch(() => {})

  // 13.4 独自イベントトラッキング (AnalyticsEvent への記録)
  void trackEvent({
    name: "view_job",
    userId,
    sessionId,
    payload: {
      jobId: id,
      utmSource: utm.source,
      utmMedium: utm.medium,
      utmCampaign: utm.campaign,
    },
  })

  return Response.json({ ok: true })
}
