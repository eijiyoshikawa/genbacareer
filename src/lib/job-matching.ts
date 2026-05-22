/**
 * リード情報から「あなたへのおすすめ求人」を抽出する。
 *
 * マッチング戦略:
 *  1. 起点求人と同じカテゴリ + 同じ県                (強)
 *  2. 起点求人と同じカテゴリ                          (中)
 *  3. 同じ県の建設業全カテゴリ                        (弱)
 *  4. それでも足りなければ全国の同カテゴリ で補完     (フォールバック)
 *
 * 起点求人本体は結果から除外する。rankScore 順に並べる。
 */

import { prisma } from "./db"
import { CONSTRUCTION_CATEGORY_VALUES } from "./categories"
import type { Prisma } from "@prisma/client"

export interface MatchedJob {
  id: string
  title: string
  category: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  tags: string[]
  companyName: string | null
}

const SELECT_FIELDS = {
  id: true,
  title: true,
  category: true,
  prefecture: true,
  city: true,
  salaryMin: true,
  salaryMax: true,
  salaryType: true,
  tags: true,
  company: { select: { name: true } },
} as const

/** 求人 ID から関連求人 take 件を抽出 */
export async function findRelatedJobs(
  sourceJobId: string,
  take: number = 3
): Promise<MatchedJob[]> {
  const source = await prisma.job
    .findUnique({
      where: { id: sourceJobId },
      select: { id: true, category: true, prefecture: true },
    })
    .catch(() => null)

  if (!source) return []

  const baseWhere: Prisma.JobWhereInput = {
    status: "active",
    id: { not: sourceJobId },
    category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
  }

  const orderBy: Prisma.JobOrderByWithRelationInput[] = [
    { rankScore: "desc" },
    { publishedAt: "desc" },
  ]

  const collected = new Map<string, MatchedJob>()

  async function fetch(where: Prisma.JobWhereInput, need: number) {
    if (need <= 0) return
    const rows = await prisma.job
      .findMany({
        where,
        orderBy,
        take: need + 5, // 重複除外で多めに取って絞る
        select: SELECT_FIELDS,
      })
      // rankScore 列が無い環境向けフォールバック
      .catch(() =>
        prisma.job
          .findMany({
            where,
            orderBy: { publishedAt: "desc" },
            take: need + 5,
            select: SELECT_FIELDS,
          })
          .catch(() => [])
      )
    for (const r of rows) {
      if (collected.size >= take) break
      if (collected.has(r.id)) continue
      collected.set(r.id, {
        id: r.id,
        title: r.title,
        category: r.category,
        prefecture: r.prefecture,
        city: r.city,
        salaryMin: r.salaryMin,
        salaryMax: r.salaryMax,
        salaryType: r.salaryType,
        tags: r.tags,
        companyName: r.company?.name ?? null,
      })
    }
  }

  // 1) 同カテゴリ + 同県
  await fetch(
    { ...baseWhere, category: source.category, prefecture: source.prefecture },
    take - collected.size
  )
  // 2) 同カテゴリ（県問わず）
  await fetch({ ...baseWhere, category: source.category }, take - collected.size)
  // 3) 同県の建設業全般
  await fetch({ ...baseWhere, prefecture: source.prefecture }, take - collected.size)
  // 4) 全国の建設業全般
  await fetch({ ...baseWhere }, take - collected.size)

  return Array.from(collected.values()).slice(0, take)
}
