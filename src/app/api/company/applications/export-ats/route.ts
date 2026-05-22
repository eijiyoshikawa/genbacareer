/**
 * GET /api/company/applications/export-ats?format=...
 *
 * ATS（採用管理システム）への取り込み用エクスポート。
 *
 * format:
 *   - "hrmos"    HRMOS Talent CSV ライク（応募者カラム）
 *   - "herp"     herp ATS CSV ライク
 *   - "csv"      汎用 CSV（フル情報、UTF-8 BOM）
 *   - "json"     JSON 配列（API 連携向け）
 *
 * 既存の applications/export と同じ status / jobId / date フィルタを受け付ける。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const VALID_STATUSES = [
  "applied",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const

type Format = "hrmos" | "herp" | "csv" | "json"
function isFormat(s: string | null): s is Format {
  return s === "hrmos" || s === "herp" || s === "csv" || s === "json"
}

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

const STATUS_JA: Record<string, string> = {
  applied: "応募済み",
  reviewing: "選考中",
  interview: "面接",
  offered: "内定",
  hired: "採用",
  rejected: "不採用",
}

// HRMOS Talent 互換のカラムキー（部分的、典型的なフィールドのみ）
const HRMOS_HEADERS = [
  "応募者氏名",
  "メールアドレス",
  "電話番号",
  "応募ポジション",
  "応募媒体",
  "応募日",
  "選考ステータス",
  "面接日時",
  "面接場所",
  "備考",
]

// herp 互換のカラムキー（typical）
const HERP_HEADERS = [
  "candidate_name",
  "candidate_email",
  "candidate_phone",
  "position",
  "source",
  "applied_at",
  "stage",
  "interview_at",
  "interview_venue",
  "notes",
]

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
  if (!companyId) return new Response("forbidden", { status: 403 })

  const url = new URL(request.url)
  const fmtRaw = url.searchParams.get("format")
  const format: Format = isFormat(fmtRaw) ? fmtRaw : "csv"
  const status = url.searchParams.get("status")
  const jobId = url.searchParams.get("jobId")
  const fromRaw = url.searchParams.get("from")
  const toRaw = url.searchParams.get("to")
  const from = fromRaw ? new Date(fromRaw) : undefined
  const to = toRaw ? new Date(toRaw) : undefined

  const where = {
    companyId,
    ...(status && (VALID_STATUSES as readonly string[]).includes(status)
      ? { status }
      : {}),
    ...(jobId ? { jobId } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from && !isNaN(from.getTime()) ? { gte: from } : {}),
            ...(to && !isNaN(to.getTime()) ? { lt: to } : {}),
          },
        }
      : {}),
  }

  const rows = await prisma.application.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10_000,
    select: {
      id: true,
      createdAt: true,
      status: true,
      message: true,
      internalNotes: true,
      interviewAt: true,
      interviewVenue: true,
      job: { select: { id: true, title: true } },
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          prefecture: true,
          city: true,
        },
      },
    },
  })

  const today = new Date().toISOString().slice(0, 10)

  if (format === "json") {
    const payload = rows.map((a) => ({
      application_id: a.id,
      applied_at: a.createdAt.toISOString(),
      stage: a.status,
      stage_label: STATUS_JA[a.status] ?? a.status,
      candidate: {
        name: a.user.name,
        email: a.user.email,
        phone: a.user.phone,
        prefecture: a.user.prefecture,
        city: a.user.city,
      },
      job: { id: a.job.id, title: a.job.title },
      message: a.message,
      internal_notes: a.internalNotes,
      interview_at: a.interviewAt ? a.interviewAt.toISOString() : null,
      interview_venue: a.interviewVenue,
    }))
    return Response.json(payload, {
      headers: {
        "Content-Disposition": `attachment; filename="applications-${today}.json"`,
        "Cache-Control": "no-store",
      },
    })
  }

  let headers: readonly string[]
  let buildRow: (a: (typeof rows)[number]) => (string | number | null)[]

  if (format === "hrmos") {
    headers = HRMOS_HEADERS
    buildRow = (a) => [
      a.user.name ?? "",
      a.user.email,
      a.user.phone ?? "",
      a.job.title,
      "ゲンバキャリア",
      a.createdAt.toISOString().slice(0, 10),
      STATUS_JA[a.status] ?? a.status,
      a.interviewAt ? a.interviewAt.toISOString() : "",
      a.interviewVenue ?? "",
      a.internalNotes ?? "",
    ]
  } else if (format === "herp") {
    headers = HERP_HEADERS
    buildRow = (a) => [
      a.user.name ?? "",
      a.user.email,
      a.user.phone ?? "",
      a.job.title,
      "genbacareer",
      a.createdAt.toISOString(),
      a.status,
      a.interviewAt ? a.interviewAt.toISOString() : "",
      a.interviewVenue ?? "",
      a.internalNotes ?? "",
    ]
  } else {
    // generic CSV
    headers = [
      "application_id",
      "applied_at",
      "stage",
      "stage_label",
      "candidate_name",
      "candidate_email",
      "candidate_phone",
      "candidate_prefecture",
      "candidate_city",
      "job_id",
      "job_title",
      "message",
      "internal_notes",
      "interview_at",
      "interview_venue",
    ]
    buildRow = (a) => [
      a.id,
      a.createdAt.toISOString(),
      a.status,
      STATUS_JA[a.status] ?? a.status,
      a.user.name ?? "",
      a.user.email,
      a.user.phone ?? "",
      a.user.prefecture ?? "",
      a.user.city ?? "",
      a.job.id,
      a.job.title,
      a.message ?? "",
      a.internalNotes ?? "",
      a.interviewAt ? a.interviewAt.toISOString() : "",
      a.interviewVenue ?? "",
    ]
  }

  const lines: string[] = [headers.map(csvEscape).join(",")]
  for (const r of rows) {
    lines.push(buildRow(r).map(csvEscape).join(","))
  }
  // BOM 付与で Excel 互換
  const csv = "﻿" + lines.join("\r\n")

  const filename = `applications-${format}-${today}.csv`
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
