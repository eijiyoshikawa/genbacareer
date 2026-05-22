/**
 * GET /api/jobs/suggest?q=...
 *
 * 求人検索のサジェスト用 API。タイトル prefix 一致 + よくあるタグからの一致を返す。
 * 応答は軽量に、最大 10 件。
 *
 * pg_trgm が入っていれば similarity でハイスコア順、なければ ILIKE prefix。
 */

import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const POPULAR_TAGS = [
  "未経験OK",
  "資格取得支援",
  "寮あり",
  "日払い",
  "週払い",
  "週休2日",
  "残業少なめ",
  "高収入",
  "若手活躍",
  "社保完備",
]

export async function GET(request: NextRequest) {
  // スクレイピング対策: 1 IP あたり 60 リクエスト/分
  const rl = checkRateLimit({
    key: `jobs-suggest:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 50)
  if (q.length < 1) {
    // 空入力時は人気タグを返す
    return Response.json(
      {
        suggestions: POPULAR_TAGS.map((label) => ({
          type: "tag" as const,
          label,
          href: `/jobs?q=${encodeURIComponent(label)}`,
        })),
      },
      { headers: { "cache-control": "public, max-age=300" } }
    )
  }

  const baseFilter = {
    status: "active" as const,
    category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
  }

  // 1) タイトル prefix / ILIKE 一致
  const titleMatches = await prisma.job
    .findMany({
      where: { ...baseFilter, title: { contains: q, mode: "insensitive" } },
      orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
      take: 6,
      select: { id: true, title: true, prefecture: true },
    })
    .catch(() => [])

  // 2) 都道府県名と合致するか
  const prefMatch = ["東京都", "大阪府", "愛知県", "神奈川県", "福岡県"].filter(
    (p) => p.includes(q) || q.includes(p)
  )

  // 3) 人気タグ部分一致
  const tagMatch = POPULAR_TAGS.filter((t) => t.includes(q) || q.includes(t))

  const suggestions: Array<{
    type: "job" | "prefecture" | "tag"
    label: string
    href: string
  }> = [
    ...titleMatches.map((j) => ({
      type: "job" as const,
      label: j.title,
      href: `/jobs/${j.id}`,
    })),
    ...prefMatch.slice(0, 2).map((p) => ({
      type: "prefecture" as const,
      label: `${p}の求人`,
      href: `/jobs?prefecture=${encodeURIComponent(p)}`,
    })),
    ...tagMatch.slice(0, 3).map((t) => ({
      type: "tag" as const,
      label: t,
      href: `/jobs?q=${encodeURIComponent(t)}`,
    })),
  ].slice(0, 10)

  return Response.json(
    { suggestions },
    { headers: { "cache-control": "public, max-age=60" } }
  )
}
