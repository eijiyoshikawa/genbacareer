import { z } from "zod"
import type { NextRequest } from "next/server"
import { listHwJobs } from "@/lib/jobs-api"
import { badRequest, runProxy } from "@/lib/jobs-api/proxy"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"

const querySchema = z.object({
  prefecture: z.string().min(1).max(20).optional(),
  jobType: z.string().min(1).max(20).optional(),
  employmentType: z.string().min(1).max(40).optional(),
  minSalary: z.coerce.number().int().min(0).optional(),
  q: z.string().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

export async function GET(request: NextRequest) {
  // HelloWork 求人 API は 1 分 60 リクエスト / IP
  const rl = checkRateLimit({
    key: `hw-jobs-list:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const params = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = querySchema.safeParse(params)
  if (!parsed.success) {
    return badRequest(
      "INVALID_PARAMETER",
      "Invalid query parameters",
      parsed.error.issues,
    )
  }

  return runProxy(() => listHwJobs(parsed.data), {
    cache: { sMaxAge: 300, swr: 600 },
  })
}
