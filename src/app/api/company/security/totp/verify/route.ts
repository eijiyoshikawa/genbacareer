/**
 * POST /api/company/security/totp/verify
 *
 * setup で生成した仮 secret + 6 桁コードを検証し、TOTP を有効化。
 * 同時に 8 件のリカバリコードを生成して 1 度だけ返す。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { verifyTotp, generateRecoveryCodes } from "@/lib/totp"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const schema = z.object({
  code: z.string().regex(/^\d{6}$/, "6 桁の数字を入力してください"),
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
      { error: "6 桁の数字を入力してください" },
      { status: 400 }
    )
  }

  const user = await prisma.companyUser
    .findUnique({ where: { id: userId } })
    .catch(() => null)
  if (!user || !user.totpSecret) {
    return Response.json(
      { error: "先に setup を実行してください" },
      { status: 400 }
    )
  }
  if (user.totpEnabled) {
    return Response.json(
      { error: "既に有効化されています" },
      { status: 400 }
    )
  }

  if (!verifyTotp(parsed.data.code, user.totpSecret)) {
    return Response.json(
      { error: "コードが正しくありません" },
      { status: 400 }
    )
  }

  const { plain, hashed } = await generateRecoveryCodes()
  await prisma.companyUser.update({
    where: { id: userId },
    data: {
      totpEnabled: true,
      totpEnabledAt: new Date(),
      totpRecoveryCodes: hashed,
    },
  })

  return Response.json({ ok: true, recoveryCodes: plain })
}
