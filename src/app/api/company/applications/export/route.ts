/**
 * GET /api/company/applications/export
 *
 * 企業の応募者リストを CSV ダウンロード。
 * Query:
 *   - status?: 応募ステータス
 *   - jobId?: 特定求人のみ
 *   - from?: ISO date  (作成日 >=)
 *   - to?:   ISO date  (作成日 < )
 *
 * BOM 付き UTF-8 (Excel 互換)。
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

function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

const STATUS_LABEL: Record<string, string> = {
  applied: "応募済み",
  reviewing: "選考中",
  interview: "面接",
  offered: "内定",
  hired: "採用",
  rejected: "不採用",
}

const HEADERS = [
  "応募 ID",
  "応募日時",
  "求人タイトル",
  "求人 ID",
  "氏名",
  "メール",
  "電話",
  "都道府県",
  "ステータス",
  "面接日時",
  "面接場所",
  "応募メッセージ",
  "社内メモ",
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
  if (!companyId) {
    return new Response("forbidden", { status: 403 })
  }

  const url = new URL(request.url)
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

  const applications = await prisma.application.findMany({
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
        },
      },
    },
  })

  const rows: string[] = [HEADERS.map(csvEscape).join(",")]
  for (const a of applications) {
    rows.push(
      [
        a.id,
        a.createdAt.toISOString(),
        a.job.title,
        a.job.id,
        a.user.name ?? "",
        a.user.email,
        a.user.phone ?? "",
        a.user.prefecture ?? "",
        STATUS_LABEL[a.status] ?? a.status,
        a.interviewAt ? a.interviewAt.toISOString() : "",
        a.interviewVenue ?? "",
        a.message ?? "",
        a.internalNotes ?? "",
      ]
        .map(csvEscape)
        .join(",")
    )
  }

  const csv = "﻿" + rows.join("\r\n")

  const today = new Date().toISOString().slice(0, 10)
  const filename = `applications-${today}.csv`

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
