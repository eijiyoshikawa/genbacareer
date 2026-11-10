/**
 * 9.6 Search Console 日次同期バッチ。
 *
 * GET/POST /api/cron/search-console-sync
 *  - Bearer CRON_SECRET 認証
 *  - 過去 3 日分 (GSC は集計遅延があるため 2〜3 日前の値を取り直す)
 *  - SearchConsoleSnapshot に upsert
 *
 * Vercel Cron 想定: 毎日 04:30 (JST 13:30)
 */

import { prisma } from "@/lib/db"
import { querySearchAnalytics } from "@/lib/gsc"
import { verifyCronAuth } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

function yyyymmdd(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
}

async function handler(request: Request) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  const siteUrl = process.env.GSC_SITE_URL
  if (!siteUrl) {
    return Response.json(
      { error: "GSC_SITE_URL not configured" },
      { status: 500 }
    )
  }

  const startedAt = new Date()
  const errors: string[] = []
  let totalRows = 0
  let totalUpserted = 0

  // 過去 4 日 〜 過去 2 日を取り直す (GSC の遅延考慮)
  const now = new Date()
  for (let offset = 4; offset >= 2; offset--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - offset)
    const dateStr = yyyymmdd(d)
    try {
      const rows = await querySearchAnalytics({
        siteUrl,
        startDate: dateStr,
        endDate: dateStr,
        rowLimit: 1000,
      })
      totalRows += rows.length
      const date = new Date(`${dateStr}T00:00:00Z`)

      for (const r of rows) {
        try {
          await prisma.searchConsoleSnapshot.upsert({
            where: {
              uniq_gsc_dimensions: {
                date,
                query: r.query.slice(0, 200),
                page: r.page.slice(0, 500),
              },
            },
            update: {
              clicks: r.clicks,
              impressions: r.impressions,
              ctr: r.ctr,
              position: r.position,
            },
            create: {
              date,
              query: r.query.slice(0, 200),
              page: r.page.slice(0, 500),
              clicks: r.clicks,
              impressions: r.impressions,
              ctr: r.ctr,
              position: r.position,
            },
          })
          totalUpserted++
        } catch (e) {
          errors.push(
            `upsert ${dateStr} ${r.query}: ${e instanceof Error ? e.message : e}`
          )
        }
      }
    } catch (e) {
      errors.push(
        `query ${dateStr}: ${e instanceof Error ? e.message : e}`
      )
    }
  }

  return Response.json({
    timestamp: startedAt.toISOString(),
    rows: totalRows,
    upserted: totalUpserted,
    errors: errors.slice(0, 10),
  })
}

export const GET = handler
export const POST = handler
