import { prisma } from "@/lib/db"
import type { Job } from "@prisma/client"
import { HwApiError } from "./errors"
import type {
  HwEmployerJobsParams,
  HwEmployerJobsResponse,
  HwJob,
  HwJobDetailResponse,
  HwJobListResponse,
  HwListJobsParams,
  HwMetaResponse,
} from "./types"

/**
 * 旧実装は外部 connector API を呼び出していたが、現在は公式 HelloWork API から
 * 取り込んだ Prisma `Job` (source = "hellowork") を直接参照する。
 * Hw* 型は元の API レスポンス契約に合わせ、Prisma 由来でわからない項目は null にする。
 */

function jobTypeFromEmployment(
  employmentType: string | null
): string | null {
  if (employmentType === "full_time") return "フルタイム"
  if (employmentType === "part_time") return "パート"
  if (employmentType === "contract") return "契約"
  return null
}

function employmentTypeFromJobType(jobType: string): string | null {
  switch (jobType) {
    case "フルタイム":
      return "full_time"
    case "パート":
      return "part_time"
    case "契約":
    case "季節":
    case "出稼ぎ":
      return "contract"
    default:
      return null
  }
}

function jobToHwJob(j: Job): HwJob {
  return {
    kjno: j.helloworkId ?? "",
    sourceDataId: "",
    title: j.title,
    occupation: null,
    description: j.description,
    jobType: jobTypeFromEmployment(j.employmentType),
    employmentType: j.employmentType,
    employmentPeriod: null,
    remoteWork: null,
    company: {
      name: null,
      nameKana: null,
      hojinno: null,
      website: null,
      description: null,
      strengths: null,
    },
    location: {
      prefecture: j.prefecture,
      address: j.address,
      employerAddress: j.address,
      employerPostalCode: null,
      nearestStation: null,
    },
    salary: {
      type: j.salaryType,
      display: null,
      min: j.salaryMin,
      max: j.salaryMax,
      base: null,
      bonus: null,
    },
    benefits: { annualHolidays: null, insurance: null },
    contact: { name: null, role: null, tel: null, email: null },
    dates: {
      receivedAt: null,
      validUntil: j.expiresAt?.toISOString() ?? null,
      applyBy: null,
    },
  }
}

function buildWhere(params: HwListJobsParams) {
  const where: Record<string, unknown> = {
    source: "hellowork",
    status: "active",
  }
  if (params.prefecture) where.prefecture = params.prefecture
  if (params.minSalary !== undefined && params.minSalary > 0) {
    where.salaryMin = { gte: params.minSalary }
  }
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { description: { contains: params.q, mode: "insensitive" } },
    ]
  }
  // jobType と employmentType は両方 employmentType カラムへ写像
  const fromJobType = params.jobType
    ? employmentTypeFromJobType(params.jobType)
    : null
  const employment = params.employmentType ?? fromJobType
  if (employment) where.employmentType = employment

  return where
}

async function fetchLastSyncedAt(): Promise<string | null> {
  const latest = await prisma.job.findFirst({
    where: { source: "hellowork" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  })
  return latest?.updatedAt.toISOString() ?? null
}

export async function listHwJobs(
  params: HwListJobsParams = {}
): Promise<HwJobListResponse> {
  const offset = Math.max(0, params.offset ?? 0)
  const limit = Math.min(Math.max(1, params.limit ?? 20), 100)
  const where = buildWhere(params)

  const [items, total, lastSyncedAt] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: offset,
      take: limit,
    }),
    prisma.job.count({ where }),
    fetchLastSyncedAt(),
  ])

  return {
    items: items.map(jobToHwJob),
    pagination: {
      offset,
      limit,
      total,
      hasMore: offset + items.length < total,
    },
    meta: { lastSyncedAt },
  }
}

export async function getHwJob(kjno: string): Promise<HwJobDetailResponse> {
  const job = await prisma.job.findUnique({ where: { helloworkId: kjno } })
  if (!job || job.source !== "hellowork") {
    throw new HwApiError(404, "NOT_FOUND", "求人が見つかりません")
  }
  return { job: jobToHwJob(job) }
}

export async function getHwEmployerJobs(
  _hojinno: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _params: HwEmployerJobsParams = {}
): Promise<HwEmployerJobsResponse> {
  // hojinno は Prisma Job に保持していないので空集合を返す
  return {
    employer: null,
    items: [],
    pagination: { offset: 0, limit: 0, total: 0, hasMore: false },
  }
}

export async function getHwMeta(): Promise<HwMetaResponse> {
  const where = { source: "hellowork", status: "active" } as const

  const [total, byPrefectureRaw, byEmploymentRaw, lastSyncedAt] =
    await Promise.all([
      prisma.job.count({ where }),
      prisma.job.groupBy({
        by: ["prefecture"],
        where,
        _count: { _all: true },
      }),
      prisma.job.groupBy({
        by: ["employmentType"],
        where,
        _count: { _all: true },
      }),
      fetchLastSyncedAt(),
    ])

  const byPrefecture: Record<string, number> = {}
  for (const row of byPrefectureRaw) {
    if (row.prefecture) byPrefecture[row.prefecture] = row._count._all
  }
  const byJobType: Record<string, number> = {}
  for (const row of byEmploymentRaw) {
    const label = jobTypeFromEmployment(row.employmentType)
    if (label) byJobType[label] = (byJobType[label] ?? 0) + row._count._all
  }

  return {
    total,
    byPrefecture,
    byJobType,
    lastSyncedAt,
    sourceDataId: null,
  }
}
