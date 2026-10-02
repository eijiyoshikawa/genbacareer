import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { CATEGORIES, CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"
import { PREFECTURES } from "@/lib/constants"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export type Suggestion = {
  type: "keyword" | "category" | "prefecture" | "job"
  label: string
  href: string
}

/**
 * 検索オートコンプリート用のサジェストを返す。
 * カテゴリ / 都道府県 / 求人タイトル の部分一致を混在して返す（建設業のみ）。
 */
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim()
  if (q.length < 1) return NextResponse.json({ suggestions: [] })

  const out: Suggestion[] = []

  // カテゴリ
  for (const c of CATEGORIES) {
    if (c.value === "other") continue
    if (c.label.includes(q)) {
      out.push({ type: "category", label: c.label, href: `/jobs?category=${c.value}` })
    }
  }

  // 都道府県
  for (const p of PREFECTURES) {
    if (p.includes(q)) {
      out.push({
        type: "prefecture",
        label: `${p}の求人`,
        href: `/jobs?prefecture=${encodeURIComponent(p)}`,
      })
    }
    if (out.length >= 6) break
  }

  // 求人タイトル（建設業・公開中）
  try {
    const jobs = await prisma.job.findMany({
      where: {
        status: "active",
        category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
        title: { contains: q, mode: "insensitive" },
      },
      select: { title: true },
      orderBy: { publishedAt: "desc" },
      take: 12,
    })
    const seen = new Set<string>()
    for (const j of jobs) {
      const t = j.title.trim()
      if (seen.has(t)) continue
      seen.add(t)
      out.push({ type: "job", label: t, href: `/jobs?q=${encodeURIComponent(t)}` })
      if (out.filter((s) => s.type === "job").length >= 6) break
    }
  } catch {
    // DB エラー時はカテゴリ/都道府県分だけ返す
  }

  return NextResponse.json({ suggestions: out.slice(0, 12) })
}
