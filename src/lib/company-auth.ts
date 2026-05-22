/**
 * 企業アカウントの認証ヘルパー
 *
 * セッションから companyId を引き、企業の status が "approved" 以外の場合は
 * 求人投稿・スカウト送信などの書き込み操作を拒否する。
 */
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export type CompanyAuthContext = {
  companyId: string
  role: "company_admin" | "company_member"
  companyStatus: string
}

export type CompanyAuthError = {
  status: 401 | 403
  error: string
}

/**
 * ログイン済みの企業ユーザーか確認する。書き込み権限が必要な場合は
 * `requireApproved: true` を渡すと status=approved 以外を 403 で弾く。
 */
export async function requireCompanyAuth(
  options: { requireApproved?: boolean } = {}
): Promise<CompanyAuthContext | CompanyAuthError> {
  const session = await auth()
  if (!session?.user) {
    return { status: 401, error: "企業アカウントでログインしてください" }
  }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return { status: 403, error: "企業アカウントでログインしてください" }
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return { status: 403, error: "企業情報が見つかりません" }
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { status: true },
  })

  if (!company) {
    return { status: 403, error: "企業情報が見つかりません" }
  }

  if (options.requireApproved && company.status !== "approved") {
    if (company.status === "rejected") {
      return {
        status: 403,
        error:
          "申し訳ございません。本アカウントではご利用いただくことができません。詳細は info@let-inc.net までお問い合わせください。",
      }
    }
    return {
      status: 403,
      error:
        "登録は運営による承認待ちです。承認完了までしばらくお待ちください。",
    }
  }

  return {
    companyId,
    role: role as "company_admin" | "company_member",
    companyStatus: company.status,
  }
}

export function isCompanyAuthError(
  ctx: CompanyAuthContext | CompanyAuthError
): ctx is CompanyAuthError {
  return "error" in ctx
}
