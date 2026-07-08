/**
 * GET /api/jobs/feed?cursor=<lastJobId>
 *
 * 縦スワイプフィード (11.5) の追加読み込み用 API。
 * cursor は直前ページの末尾 jobId。それより rank が低い (or 同 rank なら publishedAt が古い) ものを返す。
 *
 * 一覧は rankScore DESC, publishedAt DESC でソートしているため、
 * cursor によるフィルタも同じ複合キー (rankScore, publishedAt) で
 * 行う必要がある。publishedAt だけで絞ると、rankScore が高いが
 * publishedAt が新しい求人が次ページで重複表示されたり、逆に
 * cursor と同じ publishedAt で rankScore が低い求人が永久に
 * 除外されたりする。
 */

import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const PAGE_SIZE = 10

export async function GET(request: NextRequest) {
  // 求職者ログイン必須。未ログインは初期 15 件以降は閲覧不可。
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    return Response.json(
      { error: "ログインが必要です", jobs: [] },
      { status: 401 },
    )
  }

  const { searchParams } = request.nextUrl
  const cursor = searchParams.get("cursor")

  let cursorPublishedAt: Date | null = null
  let cursorRankScore: number | null = null
  if (cursor) {
    const last = await prisma.job
      .findUnique({
        where: { id: cursor },
        select: { publishedAt: true, rankScore: true },
      })
      .catch(() => null)
    cursorPublishedAt = last?.publishedAt ?? null
    cursorRankScore = last?.rankScore ?? null
  }

  const jobs = await prisma.job.findMany({
    where: {
      status: "active",
      ...(cursorPublishedAt !== null && cursorRankScore !== null
        ? {
            OR: [
              { rankScore: { lt: cursorRankScore } },
              {
                rankScore: cursorRankScore,
                publishedAt: { lt: cursorPublishedAt },
              },
            ],
          }
        : {}),
    },
    orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
    take: PAGE_SIZE,
    select: {
      id: true,
      title: true,
      prefecture: true,
      city: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      employmentType: true,
      category: true,
      tags: true,
      description: true,
      company: {
        select: { name: true, logoUrl: true, photos: true },
      },
    },
  })

  return Response.json({
    jobs: jobs.map((j) => ({
      id: j.id,
      title: j.title,
      prefecture: j.prefecture,
      city: j.city,
      salaryMin: j.salaryMin,
      salaryMax: j.salaryMax,
      salaryType: j.salaryType,
      employmentType: j.employmentType,
      category: j.category,
      tags: j.tags,
      description: j.description,
      companyName: j.company?.name ?? null,
      companyLogoUrl: j.company?.logoUrl ?? null,
      companyPhoto: j.company?.photos?.[0] ?? null,
    })),
  })
}
