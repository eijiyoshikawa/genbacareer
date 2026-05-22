/**
 * POST /api/company/security/totp/disable
 *
 * パスワードを再入力した上で TOTP を無効化。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { compare } from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const schema = z.object({
  password: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "パスワードを入力してください" },
      { status: 400 }
    )
  }

  const user = await prisma.companyUser
    .findUnique({ where: { id: userId } })
    .catch(() => null)
  if (!user) {
    return Response.json({ error: "not found" }, { status: 404 })
  }

  const ok = await compare(parsed.data.password, user.passwordHash)
  if (!ok) {
    return Response.json({ error: "パスワードが正しくありません" }, { status: 400 })
  }

  await prisma.companyUser.update({
    where: { id: userId },
    data: {
      totpEnabled: false,
      totpEnabledAt: null,
      totpSecret: null,
      totpRecoveryCodes: [],
    },
  })

  return Response.json({ ok: true })
}
