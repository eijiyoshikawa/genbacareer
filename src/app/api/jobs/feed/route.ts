/**
 * GET /api/jobs/feed?cursor=<lastJobId>
 *
 * 縦スワイプフィード (11.5) の追加読み込み用 API。
 * cursor は直前ページの末尾 jobId。それより rank が低い (or 同 rank なら publishedAt が古い) ものを返す。
 *
 * 簡略化のため、cursor は createdAt 降順で「指定 ID より古い」ものを返す
 * (rankScore のタイブレイクは厳密でなくても UX 上問題ない)。
 */

import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"

const PAGE_SIZE = 10

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const cursor = searchParams.get("cursor")

  let cursorPublishedAt: Date | null = null
  if (cursor) {
    const last = await prisma.job
      .findUnique({
        where: { id: cursor },
        select: { publishedAt: true },
      })
      .catch(() => null)
    cursorPublishedAt = last?.publishedAt ?? null
  }

  const jobs = await prisma.job.findMany({
    where: {
      status: "active",
      ...(cursorPublishedAt
        ? { publishedAt: { lt: cursorPublishedAt } }
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
