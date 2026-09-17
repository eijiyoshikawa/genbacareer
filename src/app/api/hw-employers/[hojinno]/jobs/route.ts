import { z } from "zod"
import type { NextRequest } from "next/server"
import { getHwEmployerJobs } from "@/lib/jobs-api"
import { badRequest, runProxy } from "@/lib/jobs-api/proxy"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"

const paramsSchema = z.object({
  hojinno: z.string().regex(/^\d{13}$/, "hojinno must be a 13-digit number"),
})

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ hojinno: string }> },
) {
  // 他の hw-* プロキシ API と同じく 1 分 60 リクエスト / IP に制限
  // （上流の有料 HelloWork API のクォータを hojinno 総当たりで消費されないように）
  const rl = checkRateLimit({
    key: `hw-employer-jobs:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const params = await context.params
  const parsedParams = paramsSchema.safeParse(params)
  if (!parsedParams.success) {
    return badRequest(
      "INVALID_PARAMETER",
      "Invalid hojinno",
      parsedParams.error.issues,
    )
  }

  const queryEntries = Object.fromEntries(
    request.nextUrl.searchParams.entries(),
  )
  const parsedQuery = querySchema.safeParse(queryEntries)
  if (!parsedQuery.success) {
    return badRequest(
      "INVALID_PARAMETER",
      "Invalid query parameters",
      parsedQuery.error.issues,
    )
  }

  return runProxy(
    () => getHwEmployerJobs(parsedParams.data.hojinno, parsedQuery.data),
    { cache: { sMaxAge: 300, swr: 600 } },
  )
}
