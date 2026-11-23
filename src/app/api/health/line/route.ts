import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import {
  isMessagingConfigured,
  getBotInfo,
  getMessageQuota,
  getQuotaConsumption,
} from "@/lib/line-messaging"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * LINE 配信のヘルスチェック（読み取り専用）。
 *
 * GET /api/health/line
 *   - LINE_CHANNEL_ACCESS_TOKEN / _SECRET の設定有無
 *   - トークン効力（GET /v2/bot/info が 200 か）
 *   - Push 送信枠の残量
 *   - 配信候補（LineLead で lineUserId あり & 未 optedOut）の件数
 *
 * 状態を一切変更しないので uptime 監視や運用確認に安全。
 * 200 = 配信可能 / 503 = トークン無効・未設定・候補0 などで配信不能。
 *
 * Vercel env が Sensitive で値を目視できなくても、ここを叩けば
 * 「トークンが本当に効いているか」を本番で確認できる（scripts/line-doctor の本番版）。
 */
export async function GET() {
  const configured = isMessagingConfigured()

  const result: {
    status: "ok" | "degraded"
    configured: boolean
    token: { valid: boolean; botName?: string; basicId?: string; error?: string }
    quota?: { type: string; limit?: number; used?: number; remaining?: number }
    recipients: { total: number; withLineId: number; optedOut: number; eligible: number }
  } = {
    status: "degraded",
    configured,
    token: { valid: false },
    recipients: { total: 0, withLineId: 0, optedOut: 0, eligible: 0 },
  }

  // 1) トークン効力（読み取り専用 API）
  if (configured) {
    const info = await getBotInfo()
    if (info.ok) {
      result.token = {
        valid: true,
        botName: info.info.displayName,
        basicId: info.info.basicId,
      }
      const [quota, used] = await Promise.all([
        getMessageQuota(),
        getQuotaConsumption(),
      ])
      if (quota) {
        if (quota.type === "none") {
          result.quota = { type: "none" }
        } else {
          result.quota = {
            type: "limited",
            limit: quota.value,
            used: used ?? undefined,
            remaining: used != null ? quota.value - used : undefined,
          }
        }
      }
    } else {
      result.token = { valid: false, error: `HTTP ${info.status}` }
    }
  }

  // 2) 配信候補（DB 集計）
  try {
    const [total, withLineId, optedOut, eligible] = await Promise.all([
      prisma.lineLead.count(),
      prisma.lineLead.count({ where: { lineUserId: { not: null } } }),
      prisma.lineLead.count({ where: { optedOut: true } }),
      prisma.lineLead.count({
        where: { lineUserId: { not: null }, optedOut: false },
      }),
    ])
    result.recipients = { total, withLineId, optedOut, eligible }
  } catch {
    // DB 不通時も token 情報は返す（recipients は 0 のまま）
  }

  const ok = result.configured && result.token.valid && result.recipients.eligible > 0
  result.status = ok ? "ok" : "degraded"

  return NextResponse.json(result, {
    status: ok ? 200 : 503,
    headers: {
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
    },
  })
}
