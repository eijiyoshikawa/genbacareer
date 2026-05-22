/**
 * GET /api/admin/line-leads/export
 *
 * 管理者専用: LineLead 一覧を CSV ダウンロード。
 * Query:
 *   - status?: LeadStatus (フィルタ)
 *   - q?: string (氏名 / 電話 / メール部分一致)
 *   - from?: ISO date (作成日 >=)
 *   - to?: ISO date (作成日 <)
 *
 * 出力: text/csv; charset=utf-8 (BOM 付き Excel 互換)
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isLeadStatus } from "@/lib/line-lead-status"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const session = await auth().catch(() => null)
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

// CSV フィールド エスケープ: ダブルクォート / カンマ / 改行を含む値を "" で囲み内部の " は "" に変換
function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const HEADERS = [
  "id",
  "作成日時",
  "氏名",
  "電話番号",
  "メール",
  "都道府県",
  "経験年数",
  "応募求人",
  "求人勤務地",
  "ステータス",
  "LINE 友だち",
  "LINE 表示名",
  "オプトアウト",
  "UTM source",
  "UTM medium",
  "UTM campaign",
  "メモ",
]

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return new Response("unauthorized", { status: 401 })
  }

  const url = new URL(request.url)
  const statusFilter = isLeadStatus(url.searchParams.get("status") ?? undefined)
    ? url.searchParams.get("status")!
    : undefined
  const q = (url.searchParams.get("q") ?? "").trim()
  const fromRaw = url.searchParams.get("from")
  const toRaw = url.searchParams.get("to")
  const from = fromRaw ? new Date(fromRaw) : undefined
  const to = toRaw ? new Date(toRaw) : undefined

  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    }),
    ...(from || to
      ? {
          createdAt: {
            ...(from && !isNaN(from.getTime()) ? { gte: from } : {}),
            ...(to && !isNaN(to.getTime()) ? { lt: to } : {}),
          },
        }
      : {}),
  }

  const leads = await prisma.lineLead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      id: true,
      createdAt: true,
      name: true,
      phone: true,
      email: true,
      prefecture: true,
      experienceYears: true,
      notes: true,
      status: true,
      lineUserId: true,
      lineDisplayName: true,
      optedOut: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      job: { select: { title: true, prefecture: true, city: true } },
    },
  })

  const rows: string[] = [HEADERS.map(csvEscape).join(",")]
  for (const l of leads) {
    rows.push(
      [
        l.id,
        l.createdAt.toISOString(),
        l.name,
        l.phone,
        l.email,
        l.prefecture ?? "",
        l.experienceYears ?? "",
        l.job?.title ?? "",
        [l.job?.prefecture, l.job?.city].filter(Boolean).join(" "),
        l.status,
        l.lineUserId ? "あり" : "なし",
        l.lineDisplayName ?? "",
        l.optedOut ? "はい" : "いいえ",
        l.utmSource ?? "",
        l.utmMedium ?? "",
        l.utmCampaign ?? "",
        l.notes ?? "",
      ]
        .map(csvEscape)
        .join(",")
    )
  }

  // BOM 付与で Excel が UTF-8 を正しく認識
  const csv = "﻿" + rows.join("\r\n")

  const today = new Date().toISOString().slice(0, 10)
  const filename = `line-leads-${today}.csv`

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
