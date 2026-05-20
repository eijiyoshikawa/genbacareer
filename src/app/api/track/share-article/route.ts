/**
 * POST /api/track/share-article
 *
 * 記事共有ボタンが押されたときに呼ぶトラッキング API (13.4 / 13.1)。
 * fire-and-forget、認証不要、レート制限あり。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { trackEvent } from "@/lib/track"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { getSessionIdIfExists } from "@/lib/session-id"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const rl = checkRateLimit({
    key: `share:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  let body: { articleId?: string; channel?: string } = {}
  try {
    body = await request.json()
  } catch {
    // ignore
  }

  const session = await auth().catch(() => null)
  const userId = session?.user?.id ?? null
  const sessionId = await getSessionIdIfExists().catch(() => null)

  void trackEvent({
    name: "share_article",
    userId,
    sessionId,
    payload: {
      articleId: body.articleId ?? null,
      channel: body.channel ?? "unknown",
    },
  })

  return Response.json({ ok: true })
}
