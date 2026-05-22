/**
 * GET /api/company/dashboard/export?range=30d|90d|all
 *
 * 企業ダッシュボードのファネル + 求人別パフォーマンス + 時系列を 1 つの CSV に
 * まとめてダウンロード。BOM 付き UTF-8 で Excel 互換。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import {
  computeCompanyFunnel,
  computeJobPerformance,
  computeTimeSeries,
  isRangeKey,
} from "@/lib/company-funnel"

export const dynamic = "force-dynamic"

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return new Response("unauthorized", { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return new Response("forbidden", { status: 403 })
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return new Response("forbidden", { status: 403 })
  }

  const url = new URL(request.url)
  const rangeParam = url.searchParams.get("range") ?? "30d"
  const range = isRangeKey(rangeParam) ? rangeParam : "30d"

  const [funnel, perJob, timeSeries] = await Promise.all([
    computeCompanyFunnel(companyId, range),
    computeJobPerformance(companyId, range, 100),
    computeTimeSeries(companyId, range),
  ])

  const lines: string[] = []

  // === Section 1: Header ===
  lines.push(`# 企業ダッシュボード レポート`)
  lines.push(`# 期間,${csvEscape(funnel.range.label)}`)
  lines.push(`# 生成日時,${new Date().toISOString()}`)
  lines.push("")

  // === Section 2: Funnel ===
  lines.push(`## 選考ファネル`)
  lines.push(["ステージ", "件数", "前段比"].map(csvEscape).join(","))
  for (const stage of funnel.stages) {
    lines.push(
      [
        stage.label,
        stage.count,
        stage.conversionFromPrev === null
          ? ""
          : `${(stage.conversionFromPrev * 100).toFixed(2)}%`,
      ]
        .map(csvEscape)
        .join(",")
    )
  }
  lines.push(
    [
      "総合コンバージョン (採用/閲覧)",
      funnel.hiredCount,
      funnel.overallConversion === null
        ? ""
        : `${(funnel.overallConversion * 100).toFixed(2)}%`,
    ]
      .map(csvEscape)
      .join(",")
  )
  lines.push("")

  // === Section 3: Per-job performance ===
  lines.push(`## 求人別パフォーマンス`)
  lines.push(
    ["求人 ID", "タイトル", "ステータス", "閲覧数", "応募数", "採用数", "閲覧→応募"]
      .map(csvEscape)
      .join(",")
  )
  const sortedPerJob = [...perJob].sort((a, b) => b.views - a.views)
  for (const row of sortedPerJob) {
    lines.push(
      [
        row.jobId,
        row.title,
        row.status,
        row.views,
        row.applications,
        row.hired,
        row.viewToApply === null
          ? ""
          : `${(row.viewToApply * 100).toFixed(2)}%`,
      ]
        .map(csvEscape)
        .join(",")
    )
  }
  lines.push("")

  // === Section 4: Time series ===
  lines.push(`## 時系列推移`)
  lines.push(["日付", "閲覧", "応募", "採用"].map(csvEscape).join(","))
  for (const t of timeSeries) {
    lines.push([t.date, t.views, t.applications, t.hired].map(csvEscape).join(","))
  }

  // BOM 付き Excel 互換
  const csv = "﻿" + lines.join("\r\n")

  const today = new Date().toISOString().slice(0, 10)
  const filename = `company-dashboard-${range}-${today}.csv`

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
