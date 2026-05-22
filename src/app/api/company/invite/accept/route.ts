import { type NextRequest } from "next/server"
import { z } from "zod"
import { acceptInvitation } from "@/lib/company-invitation"

const bodySchema = z.object({
  token: z.string().regex(/^[a-f0-9]{64}$/i),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(100).optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 })
  }
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const result = await acceptInvitation(parsed.data)
  if (!result.ok) {
    const message =
      result.reason === "email_taken"
        ? "このメールアドレスは既に企業アカウントとして登録されています"
        : "招待トークンが無効または期限切れです"
    const status = result.reason === "email_taken" ? 409 : 400
    return Response.json({ error: message, reason: result.reason }, { status })
  }
  return Response.json({ ok: true, companyUserId: result.companyUserId })
}
