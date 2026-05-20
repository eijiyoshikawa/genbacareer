/**
 * 通報受付 API (6.2)。
 *
 * 求人 / 企業 / ユーザー / 口コミに対する通報を受け付け、
 * Report テーブルに status="open" で保存する。
 *
 * - 未ログインでも通報可能（reporterId は null）
 * - 1 IP につき 10 件/時 で rate-limit
 * - 通報結果の処理は admin が /admin/reports で行う
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"
import {
  REPORT_REASONS,
  REPORT_TARGET_TYPES,
} from "@/lib/report-reasons"
import { trackEvent } from "@/lib/track"

const REASON_VALUES = REPORT_REASONS.map((r) => r.value) as [string, ...string[]]
const TARGET_TYPE_VALUES = [...REPORT_TARGET_TYPES] as [string, ...string[]]

const reportSchema = z.object({
  targetType: z.enum(TARGET_TYPE_VALUES),
  targetId: z.string().uuid(),
  reason: z.enum(REASON_VALUES),
  detail: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = checkRateLimit({
    key: `report:${ip}`,
    limit: 10,
    windowMs: 60 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエスト形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = reportSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const session = await auth()
  const reporterId = session?.user?.id ?? null

  await prisma.report.create({
    data: {
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reporterId,
      reporterIp: ip,
      reason: parsed.data.reason,
      detail: parsed.data.detail ?? null,
    },
  })

  await trackEvent({
    name: "report_submit",
    userId: reporterId,
    payload: {
      targetType: parsed.data.targetType,
      targetId: parsed.data.targetId,
      reason: parsed.data.reason,
    },
  })

  return Response.json({ ok: true }, { status: 201 })
}
