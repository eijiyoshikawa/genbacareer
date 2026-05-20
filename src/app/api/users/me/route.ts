import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { JOB_SEARCH_STATUSES } from "@/lib/job-search-status"
import { parsePrefs } from "@/lib/notification-prefs"

const JOB_SEARCH_STATUS_VALUES = JOB_SEARCH_STATUSES.map((s) => s.value) as [
  string,
  ...string[],
]

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  prefecture: z.string().max(10).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  desiredCategories: z.array(z.string()).optional(),
  desiredSalaryMin: z.number().int().min(0).nullable().optional(),
  profilePublic: z.boolean().optional(),
  jobSearchStatus: z.enum(JOB_SEARCH_STATUS_VALUES).optional(),
  blockedCompanyIds: z.array(z.string().uuid()).max(200).optional(),
  blockedKeywords: z.array(z.string().min(1).max(50)).max(50).optional(),
  notificationPrefs: z
    .object({
      emailEnabled: z.boolean().optional(),
      lineEnabled: z.boolean().optional(),
      pushEnabled: z.boolean().optional(),
      frequency: z.enum(["immediate", "daily", "weekly"]).optional(),
      quietHoursStart: z.number().int().min(0).max(23).nullable().optional(),
      quietHoursEnd: z.number().int().min(0).max(23).nullable().optional(),
    })
    .optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      prefecture: true,
      city: true,
      birthDate: true,
      desiredCategories: true,
      desiredSalaryMin: true,
      resumeUrl: true,
      profilePublic: true,
      jobSearchStatus: true,
      blockedCompanyIds: true,
      blockedKeywords: true,
      createdAt: true,
    },
  })

  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }

  return Response.json({ user })
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.prefecture !== undefined ? { prefecture: data.prefecture } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.birthDate !== undefined
        ? { birthDate: data.birthDate ? new Date(data.birthDate) : null }
        : {}),
      ...(data.desiredCategories !== undefined
        ? { desiredCategories: data.desiredCategories }
        : {}),
      ...(data.desiredSalaryMin !== undefined
        ? { desiredSalaryMin: data.desiredSalaryMin }
        : {}),
      ...(data.profilePublic !== undefined
        ? { profilePublic: data.profilePublic }
        : {}),
      ...(data.jobSearchStatus !== undefined
        ? { jobSearchStatus: data.jobSearchStatus }
        : {}),
      ...(data.blockedCompanyIds !== undefined
        ? { blockedCompanyIds: data.blockedCompanyIds }
        : {}),
      ...(data.blockedKeywords !== undefined
        ? { blockedKeywords: data.blockedKeywords }
        : {}),
      ...(data.notificationPrefs !== undefined
        ? {
            notificationPrefs: parsePrefs(
              data.notificationPrefs
            ) as unknown as object,
          }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      prefecture: true,
      city: true,
      birthDate: true,
      desiredCategories: true,
      desiredSalaryMin: true,
      profilePublic: true,
      jobSearchStatus: true,
      blockedCompanyIds: true,
      blockedKeywords: true,
      notificationPrefs: true,
    },
  })

  return Response.json({ user })
}
