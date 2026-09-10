import { type NextRequest } from "next/server"
import { z } from "zod"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

// 学歴/職歴/免許/職務経歴の各エントリは内部形式を厳密には定めていないため
// record として受け、件数と合計サイズだけ上限を設ける。以前はここに一切の
// 上限が無く、クライアントが任意サイズの JSON を送りつけて DB を肥大化させ
// たり、印刷/PDF 生成ページ（配列を丸ごと反復描画）を重くしたりできた。
const MAX_JSON_ARRAY_ENTRIES = 30
const MAX_JSON_FIELD_BYTES = 50_000

const jsonArraySchema = z
  .array(z.record(z.string(), z.unknown()))
  .max(MAX_JSON_ARRAY_ENTRIES, `${MAX_JSON_ARRAY_ENTRIES} 件以内にしてください`)
  .refine(
    (arr) => Buffer.byteLength(JSON.stringify(arr), "utf8") <= MAX_JSON_FIELD_BYTES,
    { message: "データサイズが大きすぎます" }
  )
  .optional()

const resumeSchema = z.object({
  fullName: z.string().max(100).optional(),
  furigana: z.string().max(100).optional(),
  birthDate: z.string().max(30).optional(),
  gender: z.string().max(10).optional(),
  postalCode: z.string().max(10).optional(),
  address: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
  email: z.string().max(255).optional(),
  educationHistory: jsonArraySchema,
  workHistory: jsonArraySchema,
  licenses: jsonArraySchema,
  motivation: z.string().max(4000).optional(),
  selfPr: z.string().max(4000).optional(),
  careerSummary: z.string().max(4000).optional(),
  careerDetails: jsonArraySchema,
  skills: z.array(z.string().max(100)).max(30).optional(),
  qualifications: z.array(z.string().max(100)).max(30).optional(),
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

  const data = sanitizeResumeData(parsed.data)

  const resume = await prisma.resume.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      ...data,
    },
    update: data,
  })

  return Response.json({ resume })
}

function sanitizeResumeData(body: z.infer<typeof resumeSchema>) {
  return {
    fullName: body.fullName,
    furigana: body.furigana,
    birthDate: body.birthDate !== undefined ? new Date(body.birthDate) : undefined,
    gender: body.gender,
    postalCode: body.postalCode,
    address: body.address,
    phone: body.phone,
    email: body.email,
    educationHistory: body.educationHistory as Prisma.InputJsonValue | undefined,
    workHistory: body.workHistory as Prisma.InputJsonValue | undefined,
    licenses: body.licenses as Prisma.InputJsonValue | undefined,
    motivation: body.motivation,
    selfPr: body.selfPr,
    careerSummary: body.careerSummary,
    careerDetails: body.careerDetails as Prisma.InputJsonValue | undefined,
    skills: body.skills,
    qualifications: body.qualifications,
  }
}
