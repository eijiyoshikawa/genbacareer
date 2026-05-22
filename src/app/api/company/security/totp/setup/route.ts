/**
 * POST /api/company/security/totp/setup
 *
 * 一時的な TOTP シークレットを発行し、QR コード（dataURL）を返す。
 * この時点ではまだ totpEnabled=false。`/verify` で正しい 6 桁コードを送ると
 * 有効化される。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateTotpSecret, buildOtpAuthUrl } from "@/lib/totp"
import QRCode from "qrcode"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) {
    return Response.json({ error: "forbidden" }, { status: 403 })
  }

  const user = await prisma.companyUser
    .findUnique({ where: { id: userId } })
    .catch(() => null)
  if (!user) {
    return Response.json({ error: "not found" }, { status: 404 })
  }
  if (user.totpEnabled) {
    return Response.json(
      { error: "既に 2 段階認証が有効です" },
      { status: 400 }
    )
  }

  const secret = generateTotpSecret()
  // 仮 secret を保存（totpEnabled は false のまま）
  await prisma.companyUser.update({
    where: { id: userId },
    data: { totpSecret: secret },
  })

  const otpAuthUrl = buildOtpAuthUrl(user.email, secret)
  const qrDataUrl = await QRCode.toDataURL(otpAuthUrl, { width: 240, margin: 1 })

  return Response.json({ secret, otpAuthUrl, qrDataUrl })
}
