import { z } from "zod"
import { getHwJob } from "@/lib/jobs-api"
import { badRequest, runProxy } from "@/lib/jobs-api/proxy"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"

const paramsSchema = z.object({
  kjno: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[\w-]+$/, "kjno must contain only alphanumerics, underscore, or hyphen"),
})

export async function GET(
  request: Request,
  context: { params: Promise<{ kjno: string }> },
) {
  // 1 分 60 リクエスト / IP
  const rl = checkRateLimit({
    key: `hw-job-detail:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const params = await context.params
  const parsed = paramsSchema.safeParse(params)
  if (!parsed.success) {
    return badRequest("INVALID_PARAMETER", "Invalid kjno", parsed.error.issues)
  }

  return runProxy(() => getHwJob(parsed.data.kjno), {
    cache: { sMaxAge: 600, swr: 1_200 },
  })
}
