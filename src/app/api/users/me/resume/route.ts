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
    const raw: unknown = await request.json()
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
    }
    body = raw as Record<string, unknown>
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const data = sanitizeResumeData(body)
  try {
    const resume = await prisma.resume.upsert({
      where: { userId: session.user.id },
      create: { userId: session.user.id, ...data },
      update: data,
    })
    return Response.json({ resume })
  } catch (e) {
    console.error("[resume] save failed:", e instanceof Error ? e.message : e)
    return Response.json(
      { error: "保存に失敗しました。入力内容をご確認ください。" },
      { status: 400 }
    )
  }
}

// 生年月日: 未入力 ("") は null (クリア)、不正な日付は無視する。
// new Date("") は Invalid Date になり Prisma が例外を投げて 500 になっていた。
function parseBirthDate(value: unknown): Date | null | undefined {
  if (value === null || value === "") return null
  if (typeof value !== "string") return undefined
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return undefined
  const year = d.getUTCFullYear()
  if (year < 1900 || year > 2100) return undefined
  return d
}

// Json カラムに生の null / プリミティブが渡ると Prisma が例外を投げるため、
// 配列・オブジェクト以外は無視する。
function jsonOrUndefined(value: unknown): object | undefined {
  return value !== null && typeof value === "object" ? value : undefined
}

function sanitizeResumeData(body: Record<string, unknown>) {
  return {
    fullName: typeof body.fullName === "string" ? body.fullName : undefined,
    furigana: typeof body.furigana === "string" ? body.furigana : undefined,
    birthDate: parseBirthDate(body.birthDate),
    gender: typeof body.gender === "string" ? body.gender : undefined,
    postalCode: typeof body.postalCode === "string" ? body.postalCode : undefined,
    address: typeof body.address === "string" ? body.address : undefined,
    phone: typeof body.phone === "string" ? body.phone : undefined,
    email: typeof body.email === "string" ? body.email : undefined,
    educationHistory: jsonOrUndefined(body.educationHistory),
    workHistory: jsonOrUndefined(body.workHistory),
    licenses: jsonOrUndefined(body.licenses),
    motivation: typeof body.motivation === "string" ? body.motivation : undefined,
    selfPr: typeof body.selfPr === "string" ? body.selfPr : undefined,
    careerSummary: typeof body.careerSummary === "string" ? body.careerSummary : undefined,
    careerDetails: jsonOrUndefined(body.careerDetails),
    skills: Array.isArray(body.skills) ? body.skills.filter((s): s is string => typeof s === "string") : undefined,
    qualifications: Array.isArray(body.qualifications) ? body.qualifications.filter((s): s is string => typeof s === "string") : undefined,
  }
}
