/**
 * GET /api/integrations/unsplash/search?q=...&orientation=landscape
 *
 * 企業プロフィール編集の「素材から選ぶ」モーダルから呼ばれる。
 * Unsplash API をプロキシし、必要な情報だけクライアントに返す。
 *
 * 認証: company_admin / company_member ロール必須。
 * レート制限: 同一企業から 30 req / 10 min。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import {
  searchUnsplashPhotos,
  isUnsplashConfigured,
} from "@/lib/unsplash"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const querySchema = z.object({
  q: z.string().trim().min(1).max(100),
  orientation: z.enum(["landscape", "portrait", "squarish"]).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth().catch(() => null)
  const role = (session?.user as { role?: string } | undefined)?.role
  const companyId = (session?.user as { companyId?: string } | undefined)?.companyId
  if (!session?.user || (role !== "company_admin" && role !== "company_member") || !companyId) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  if (!isUnsplashConfigured()) {
    return Response.json(
      { error: "unsplash_not_configured", message: "UNSPLASH_ACCESS_KEY が未設定です" },
      { status: 503 }
    )
  }

  const rl = checkRateLimit({
    key: `unsplash:${companyId}`,
    limit: 30,
    windowMs: 10 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    q: url.searchParams.get("q") ?? "",
    orientation: url.searchParams.get("orientation") ?? undefined,
  })
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_query", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const result = await searchUnsplashPhotos(parsed.data.q, {
      perPage: 18,
      orientation: parsed.data.orientation,
    })
    return Response.json(result)
  } catch (e) {
    console.error(`[unsplash.search] ${e instanceof Error ? e.message : e}`)
    return Response.json({ error: "upstream_error" }, { status: 502 })
  }
}
