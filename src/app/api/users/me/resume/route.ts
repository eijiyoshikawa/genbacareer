import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

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

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const resume = await prisma.resume.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...sanitizeResumeData(body),
    },
    update: sanitizeResumeData(body),
  })

  return Response.json({ resume })
}

function sanitizeResumeData(body: Record<string, unknown>) {
  return {
    fullName: typeof body.fullName === "string" ? body.fullName : undefined,
    furigana: typeof body.furigana === "string" ? body.furigana : undefined,
    birthDate: typeof body.birthDate === "string" ? new Date(body.birthDate) : undefined,
    gender: typeof body.gender === "string" ? body.gender : undefined,
    postalCode: typeof body.postalCode === "string" ? body.postalCode : undefined,
    address: typeof body.address === "string" ? body.address : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    educationHistory: body.educationHistory !== undefined ? body.educationHistory as object : undefined,
    workHistory: body.workHistory !== undefined ? body.workHistory as object : undefined,
    licenses: body.licenses !== undefined ? body.licenses as object : undefined,
    motivation: typeof body.motivation === "string" ? body.motivation : undefined,
    selfPr: typeof body.selfPr === "string" ? body.selfPr : undefined,
    careerSummary: typeof body.careerSummary === "string" ? body.careerSummary : undefined,
    careerDetails: body.careerDetails !== undefined ? body.careerDetails as object : undefined,
    skills: Array.isArray(body.skills) ? body.skills.filter((s): s is string => typeof s === "string") : undefined,
    qualifications: Array.isArray(body.qualifications) ? body.qualifications.filter((s): s is string => typeof s === "string") : undefined,
  }
}
