/**
 * GET /api/jobs/feed?cursor=<lastJobId>
 *
 * 縦スワイプフィード (11.5) の追加読み込み用 API。
 * cursor は直前ページの末尾 jobId。一覧の並び順 (rankScore desc, publishedAt desc)
 * と同じ複合キーで keyset pagination する: rankScore が cursor より低いもの、
 * または同 rank なら publishedAt が cursor より古いもの。
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

  let cursorJob: { rankScore: number; publishedAt: Date | null } | null = null
  if (cursor) {
    cursorJob = await prisma.job
      .findUnique({
        where: { id: cursor },
        select: { rankScore: true, publishedAt: true },
      })
      .catch(() => null)
  }

  const jobs = await prisma.job.findMany({
    where: {
      status: "active",
      ...(cursorJob
        ? {
            OR: [
              { rankScore: { lt: cursorJob.rankScore } },
              ...(cursorJob.publishedAt
                ? [
                    {
                      rankScore: cursorJob.rankScore,
                      publishedAt: { lt: cursorJob.publishedAt },
                    },
                  ]
                : []),
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
