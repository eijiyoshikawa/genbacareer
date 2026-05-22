/**
 * 求職者向け「あなたへのおすすめ求人」の生成ロジック。
 *
 * シグナル:
 *   1. JobFavorite — お気に入りに入れた求人 (重み × 2)
 *   2. Application — 応募した求人 (重み × 3)
 *   3. JobView     — 直近 90 日の閲覧履歴 (重み × 1)
 *
 * カテゴリ / 都道府県を集計し、最頻のものを優先候補に。
 * - 既に応募済み / お気に入り済み / 直近閲覧済みは除外
 * - 非アクティブ求人 (status !== "active") は除外
 * - 建設業 9 カテゴリに限定
 * - 募集が枯れた場合は最新ハイランクの建設業求人にフォールバック
 */

import { prisma } from "@/lib/db"
import {
  CONSTRUCTION_CATEGORY_VALUES,
  isConstructionCategory,
} from "@/lib/categories"

const RECENT_DAYS = 90

export type RecommendedJob = {
  id: string
  title: string
  category: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  employmentType: string | null
  source: string
  tags: string[]
  company: {
    name: string
    logoUrl: string | null
    /** GbizINFO JSONB（JobCard 内で建設業許可バッジ判定に使用） */
    gbizData?: unknown
  } | null
}

/**
 * userId または sessionId からシグナルを集約し、興味カテゴリ/都道府県を返す。
 * シグナルゼロのユーザーには空配列を返す。
 *
 * - userId 指定: JobFavorite + Application + JobView をクロス参照
 * - sessionId 指定 (匿名): JobView のみを参照（Cookie ベース）
 */
async function gatherUserSignals(input: {
  userId?: string | null
  sessionId?: string | null
}): Promise<{
  preferredCategories: string[]
  preferredPrefectures: string[]
  excludeIds: Set<string>
}> {
  const since = new Date(Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000)

  const [favorites, applications, views] = await Promise.all([
    input.userId
      ? prisma.jobFavorite
          .findMany({
            where: { userId: input.userId },
            select: {
              jobId: true,
              job: { select: { category: true, prefecture: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
          })
          .catch(() => [])
      : Promise.resolve([]),
    input.userId
      ? prisma.application
          .findMany({
            where: { userId: input.userId },
            select: {
              jobId: true,
              job: { select: { category: true, prefecture: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 30,
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.jobView
      .findMany({
        where: {
          viewedAt: { gte: since },
          ...(input.userId
            ? { userId: input.userId }
            : input.sessionId
              ? { sessionId: input.sessionId, userId: null }
              : { id: "__never__" }),
        },
        select: {
          jobId: true,
          job: { select: { category: true, prefecture: true } },
        },
        orderBy: { viewedAt: "desc" },
        take: 50,
        distinct: ["jobId"],
      })
      .catch(() => []),
  ])

  const categoryScore = new Map<string, number>()
  const prefectureScore = new Map<string, number>()
  const excludeIds = new Set<string>()

  function bump(
    map: Map<string, number>,
    key: string | null | undefined,
    weight: number
  ) {
    if (!key) return
    map.set(key, (map.get(key) ?? 0) + weight)
  }

  for (const f of favorites) {
    excludeIds.add(f.jobId)
    bump(categoryScore, f.job?.category, 2)
    bump(prefectureScore, f.job?.prefecture, 2)
  }
  for (const a of applications) {
    excludeIds.add(a.jobId)
    bump(categoryScore, a.job?.category, 3)
    bump(prefectureScore, a.job?.prefecture, 3)
  }
  for (const v of views) {
    excludeIds.add(v.jobId)
    bump(categoryScore, v.job?.category, 1)
    bump(prefectureScore, v.job?.prefecture, 1)
  }

  const preferredCategories = [...categoryScore.entries()]
    .filter(([k]) => isConstructionCategory(k))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)

  const preferredPrefectures = [...prefectureScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k)

  return { preferredCategories, preferredPrefectures, excludeIds }
}

/**
 * パーソナライズされたおすすめ求人を最大 limit 件返す。
 *
 * 戦略:
 *   1. シグナルから興味カテゴリ + 都道府県を抽出
 *      - ログイン: JobFavorite + Application + JobView
 *      - 匿名 (sessionId 渡し): JobView のみ
 *   2. (category IN preferred) AND (prefecture IN preferred) でハイスコア順検索
 *   3. 不足分は (category IN preferred) のみで補完
 *   4. それでも不足なら全建設業 rankScore desc で補完
 *
 * 第 2 引数は後方互換のため number (limit) を直接渡しても動く。
 */
export async function getRecommendedJobs(
  userIdOrInput:
    | string
    | null
    | undefined
    | { userId?: string | null; sessionId?: string | null },
  limit = 6
): Promise<RecommendedJob[]> {
  const input =
    typeof userIdOrInput === "object" && userIdOrInput !== null
      ? userIdOrInput
      : { userId: userIdOrInput ?? null, sessionId: null }
  const userId = input.userId ?? null
  const sessionId = input.sessionId ?? null

  const select = {
    id: true,
    title: true,
    category: true,
    prefecture: true,
    city: true,
    salaryMin: true,
    salaryMax: true,
    salaryType: true,
    employmentType: true,
    source: true,
    tags: true,
    company: { select: { name: true, logoUrl: true, gbizData: true } },
  } as const

  const baseFilter = {
    status: "active" as const,
    category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
  }

  // userId も sessionId も無い → グローバル人気求人
  if (!userId && !sessionId) {
    return prisma.job
      .findMany({
        where: baseFilter,
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
        take: limit,
        select,
      })
      .catch(() => [])
  }

  const { preferredCategories, preferredPrefectures, excludeIds } =
    await gatherUserSignals({ userId, sessionId })

  // シグナルが全くない (新規ユーザー) → グローバル人気求人
  if (preferredCategories.length === 0 && preferredPrefectures.length === 0) {
    return prisma.job
      .findMany({
        where: baseFilter,
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
        take: limit,
        select,
      })
      .catch(() => [])
  }

  const excludeArray = [...excludeIds]
  const notInExclude =
    excludeArray.length > 0 ? { id: { notIn: excludeArray } } : {}

  const collected = new Map<string, RecommendedJob>()

  // 1) 興味カテゴリ AND 興味都道府県
  if (preferredCategories.length > 0 && preferredPrefectures.length > 0) {
    const tier1 = await prisma.job
      .findMany({
        where: {
          ...baseFilter,
          category: { in: preferredCategories },
          prefecture: { in: preferredPrefectures },
          ...notInExclude,
        },
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
        take: limit,
        select,
      })
      .catch(() => [])
    for (const j of tier1) collected.set(j.id, j)
  }

  // 2) 興味カテゴリのみ
  if (collected.size < limit && preferredCategories.length > 0) {
    const tier2 = await prisma.job
      .findMany({
        where: {
          ...baseFilter,
          category: { in: preferredCategories },
          ...(collected.size > 0
            ? { id: { notIn: [...collected.keys(), ...excludeArray] } }
            : notInExclude),
        },
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
        take: limit - collected.size,
        select,
      })
      .catch(() => [])
    for (const j of tier2) collected.set(j.id, j)
  }

  // 3) 興味都道府県のみ
  if (collected.size < limit && preferredPrefectures.length > 0) {
    const tier3 = await prisma.job
      .findMany({
        where: {
          ...baseFilter,
          prefecture: { in: preferredPrefectures },
          ...(collected.size > 0
            ? { id: { notIn: [...collected.keys(), ...excludeArray] } }
            : notInExclude),
        },
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
        take: limit - collected.size,
        select,
      })
      .catch(() => [])
    for (const j of tier3) collected.set(j.id, j)
  }

  // 4) フォールバック: 全建設業
  if (collected.size < limit) {
    const tier4 = await prisma.job
      .findMany({
        where: {
          ...baseFilter,
          ...(collected.size > 0
            ? { id: { notIn: [...collected.keys(), ...excludeArray] } }
            : notInExclude),
        },
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
        take: limit - collected.size,
        select,
      })
      .catch(() => [])
    for (const j of tier4) collected.set(j.id, j)
  }

  return [...collected.values()].slice(0, limit)
}
