/**
 * POST /api/points/lottery
 *
 * ログイン中の求職者が抽選を 1 回回す。ポイント消費・抽選・結果記録は
 * すべて drawLottery 内のトランザクションで原子的に処理する。
 */

import { auth } from "@/lib/auth"
import { drawLottery, PointError } from "@/lib/points"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const session = await auth().catch(() => null)
  const userId = session?.user?.id
  if (!userId) {
    return Response.json({ ok: false, error: "ログインが必要です" }, { status: 401 })
  }

  // 連打・自動化対策: 1 分 20 回 / IP
  const rl = checkRateLimit({
    key: `lottery:${getClientIp(request)}`,
    limit: 20,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const result = await drawLottery(userId)
    return Response.json({ ok: true, result })
  } catch (e) {
    if (e instanceof PointError) {
      return Response.json(
        { ok: false, code: e.code, error: e.message },
        { status: 400 },
      )
    }
    return Response.json(
      { ok: false, error: "抽選に失敗しました。時間をおいて再度お試しください" },
      { status: 500 },
    )
  }
}
