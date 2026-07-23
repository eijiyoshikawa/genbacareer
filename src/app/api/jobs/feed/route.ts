/**
 * GET /api/jobs/feed?cursor=<lastJobId>
 *
 * 縦スワイプフィード (11.5) の追加読み込み用 API。
 * 一覧の並び順 (buildPublicJobOrderBy("recommended") = displayPriority asc,
 * rankScore desc, publishedAt desc) と同じキーで keyset pagination する。
 * publishedAt だけを cursor にすると、rankScore が主要な並び替えキーである
 * ため前ページと同じ求人が再出現したり、逆に一度も表示されない求人が
 * 発生し得るため、3 キー (+ id タイブレイク) すべてを cursor に含める。
 */

import { type NextRequest } from "next/server"
import { type Prisma } from "@prisma/client"
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

  let cursorWhere: Prisma.JobWhereInput | null = null
  if (cursor) {
    const last = await prisma.job
      .findUnique({
        where: { id: cursor },
        select: { displayPriority: true, rankScore: true, publishedAt: true, id: true },
      })
      .catch(() => null)
    if (last) {
      const publishedAt = last.publishedAt ?? new Date(0)
      // orderBy と同じキー (displayPriority asc, rankScore desc, publishedAt desc, id asc)
      // での「cursor の次から」を表す keyset 条件。
      cursorWhere = {
        OR: [
          { displayPriority: { gt: last.displayPriority } },
          {
            displayPriority: last.displayPriority,
            rankScore: { lt: last.rankScore },
          },
          {
            displayPriority: last.displayPriority,
            rankScore: last.rankScore,
            publishedAt: { lt: publishedAt },
          },
          {
            displayPriority: last.displayPriority,
            rankScore: last.rankScore,
            publishedAt,
            id: { gt: last.id },
          },
        ],
      }
    }
  }

  // 写真の無い求人の背景にはマガジン記事のカバー写真を転用する
  const [jobs, imagePool] = await Promise.all([
    prisma.job.findMany({
      where: {
        status: "active",
        ...(cursorWhere ?? {}),
      },
      orderBy: [...buildPublicJobOrderBy("recommended"), { id: "asc" }],
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
