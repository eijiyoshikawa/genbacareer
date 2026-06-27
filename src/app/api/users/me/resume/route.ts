import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const educationEntrySchema = z.object({
  period: z.string().max(50).optional(),
  school: z.string().max(200).optional(),
  faculty: z.string().max(200).optional(),
  degree: z.string().max(100).optional(),
}).strict()

const workEntrySchema = z.object({
  period: z.string().max(50).optional(),
  company: z.string().max(200).optional(),
  position: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
}).strict()

const licenseEntrySchema = z.object({
  name: z.string().max(200),
  acquiredAt: z.string().max(50).optional(),
}).strict()

const careerDetailEntrySchema = z.object({
  company: z.string().max(200).optional(),
  period: z.string().max(50).optional(),
  position: z.string().max(200).optional(),
  description: z.string().max(4000).optional(),
}).strict()

const resumeSchema = z.object({
  fullName: z.string().max(100).optional(),
  furigana: z.string().max(100).optional(),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  postalCode: z.string().max(10).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().max(255).optional().nullable(),
  educationHistory: z.array(educationEntrySchema).max(20).optional().nullable(),
  workHistory: z.array(workEntrySchema).max(30).optional().nullable(),
  licenses: z.array(licenseEntrySchema).max(50).optional().nullable(),
  motivation: z.string().max(4000).optional().nullable(),
  selfPr: z.string().max(4000).optional().nullable(),
  careerSummary: z.string().max(2000).optional().nullable(),
  careerDetails: z.array(careerDetailEntrySchema).max(30).optional().nullable(),
  skills: z.array(z.string().max(100)).max(50).optional(),
  qualifications: z.array(z.string().max(200)).max(50).optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const resume = await prisma.resume.findUnique({
    where: { userId: session.user.id },
  })

  return Response.json({ resume })
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

  const parsed = resumeSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data

  const resume = await prisma.resume.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...buildResumeData(data),
    },
    update: buildResumeData(data),
  })

  return Response.json({ resume })
}

function buildResumeData(data: z.infer<typeof resumeSchema>) {
  return {
    ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
    ...(data.furigana !== undefined ? { furigana: data.furigana } : {}),
    ...(data.birthDate !== undefined
      ? { birthDate: data.birthDate ? new Date(data.birthDate) : null }
      : {}),
    ...(data.gender !== undefined ? { gender: data.gender } : {}),
    ...(data.postalCode !== undefined ? { postalCode: data.postalCode } : {}),
    ...(data.address !== undefined ? { address: data.address } : {}),
    ...(data.phone !== undefined ? { phone: data.phone } : {}),
    ...(data.email !== undefined ? { email: data.email } : {}),
    ...(data.educationHistory !== undefined
      ? { educationHistory: data.educationHistory as unknown as object }
      : {}),
    ...(data.workHistory !== undefined
      ? { workHistory: data.workHistory as unknown as object }
      : {}),
    ...(data.licenses !== undefined
      ? { licenses: data.licenses as unknown as object }
      : {}),
    ...(data.motivation !== undefined ? { motivation: data.motivation } : {}),
    ...(data.selfPr !== undefined ? { selfPr: data.selfPr } : {}),
    ...(data.careerSummary !== undefined ? { careerSummary: data.careerSummary } : {}),
    ...(data.careerDetails !== undefined
      ? { careerDetails: data.careerDetails as unknown as object }
      : {}),
    ...(data.skills !== undefined ? { skills: data.skills } : {}),
    ...(data.qualifications !== undefined ? { qualifications: data.qualifications } : {}),
  }
}
