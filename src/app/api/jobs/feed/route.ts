/**
 * GET /api/jobs/feed?cursor=<lastJobId>
 *
 * 縦スワイプフィード (11.5) の追加読み込み用 API。
 * cursor は直前ページの末尾 jobId。それより順位が低い (displayPriority/rankScore/publishedAt
 * の複合キーで判定) ものを返す。
 *
 * 一覧の並び順は buildPublicJobOrderBy("recommended") = [displayPriority asc, rankScore desc,
 * publishedAt desc] の複合キーだが、cursor 判定を publishedAt だけで行うと
 * displayPriority/rankScore が高いのに publishedAt が古い求人が次ページで重複表示されたり、
 * 逆に publishedAt が新しいのに rank が低い求人が永久にスキップされたりする。
 * そのため cursor 側も同じ複合キーで keyset pagination する。
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

  let cursorState: {
    displayPriority: number
    rankScore: number
    publishedAt: Date
  } | null = null
  if (cursor) {
    const last = await prisma.job
      .findUnique({
        where: { id: cursor },
        select: { displayPriority: true, rankScore: true, publishedAt: true },
      })
      .catch(() => null)
    if (last?.publishedAt) {
      cursorState = {
        displayPriority: last.displayPriority,
        rankScore: last.rankScore,
        publishedAt: last.publishedAt,
      }
    }
  }

  // 写真の無い求人の背景にはマガジン記事のカバー写真を転用する
  const [jobs, imagePool] = await Promise.all([
    prisma.job.findMany({
      where: {
        status: "active",
        // 一覧の並び順 [displayPriority asc, rankScore desc, publishedAt desc] と
        // 同じ複合キーで「直前ページの末尾より後ろ」を判定する keyset pagination。
        ...(cursorState
          ? {
              OR: [
                { displayPriority: { gt: cursorState.displayPriority } },
                {
                  displayPriority: cursorState.displayPriority,
                  rankScore: { lt: cursorState.rankScore },
                },
                {
                  displayPriority: cursorState.displayPriority,
                  rankScore: cursorState.rankScore,
                  publishedAt: { lt: cursorState.publishedAt },
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
