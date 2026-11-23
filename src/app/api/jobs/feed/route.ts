/**
 * GET /api/jobs/feed?cursor=<lastJobId>
 *
 * 縦スワイプフィード (11.5) の追加読み込み用 API。
 * orderBy (displayPriority asc, rankScore desc, publishedAt desc) の全キーで
 * keyset pagination する。publishedAt のみで cursor を切ると、上位ページで
 * displayPriority/rankScore の高いタイに埋もれた行より後に publishedAt が新しい
 * 低ランク求人が、以降のどのページでも二度と返らなくなるため
 * (publishedAt だけの条件では displayPriority/rankScore の低さを考慮できない)。
 */

import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { buildPublicJobOrderBy } from "@/lib/job-sort"
import { getMagazineImagePool, pickPoolImage } from "@/lib/journal-images"

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

  let cursorRow: {
    displayPriority: number
    rankScore: number
    publishedAt: Date | null
  } | null = null
  if (cursor) {
    cursorRow = await prisma.job
      .findUnique({
        where: { id: cursor },
        select: { displayPriority: true, rankScore: true, publishedAt: true },
      })
      .catch(() => null)
  }

  // 写真の無い求人の背景にはマガジン記事のカバー写真を転用する
  const [jobs, imagePool] = await Promise.all([
    prisma.job.findMany({
      where: {
        status: "active",
        ...(cursor ? { id: { not: cursor } } : {}),
        ...(cursorRow
          ? {
              OR: [
                { displayPriority: { gt: cursorRow.displayPriority } },
                {
                  displayPriority: cursorRow.displayPriority,
                  rankScore: { lt: cursorRow.rankScore },
                },
                {
                  displayPriority: cursorRow.displayPriority,
                  rankScore: cursorRow.rankScore,
                  ...(cursorRow.publishedAt
                    ? { publishedAt: { lt: cursorRow.publishedAt } }
                    : {}),
                },
              ],
            }
          : {}),
      },
      orderBy: buildPublicJobOrderBy("recommended"),
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
        imageUrls: true,
        company: {
          select: { name: true, logoUrl: true, photos: true },
        },
      },
    }),
    getMagazineImagePool(),
  ])

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
      image:
        j.imageUrls?.[0] ??
        j.company?.photos?.[0] ??
        pickPoolImage(imagePool, j.id),
    })),
  })
}
