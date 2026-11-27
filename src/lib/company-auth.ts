/**
 * 企業アカウントの認証ヘルパー
 *
 * セッションから companyId を引き、企業の status が "approved" 以外の場合は
 * 求人投稿・スカウト送信などの書き込み操作を拒否する。
 */
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isPlanActive } from "@/lib/plans"

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

/**
 * 運営が利用停止 (rejected) にした企業かどうか。停止済みなら表示用の文言を返す。
 *
 * 求人の投稿・公開は requireCompanyAuth({ requireApproved: true }) で止まるが、
 * 応募者の選考操作と一覧の書き出しはセッションだけを見ていたため、不正などで
 * 停止した企業が応募者の氏名・連絡先を書き出したり、内定・不採用の通知を
 * 送ったりできた。承認待ち (pending) は対象外 (応募がまだ無く、止める理由もない)。
 */
export async function getSuspendedCompanyError(
  companyId: string
): Promise<string | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { status: true },
  })
  if (!company) return "企業情報が見つかりません"
  if (company.status === "rejected") {
    return "申し訳ございません。本アカウントではご利用いただくことができません。詳細は info@let-inc.net までお問い合わせください。"
  }
  return null
}

/**
 * 月額 / SNS プランの契約期間が切れている企業かどうか。切れていれば表示用の文言を返す。
 *
 * 期限切れの cron (expire-plans) は掲載順位 (planTier) を下げるだけで、求人の新規公開は
 * 止めていなかった。月額プランは採用時の成果報酬が発生しないため、更新しないまま
 * 求人を公開し続ければ無料で採用まで進められた。新しく公開する操作だけを止める
 * (掲載中の求人と下書きの保存には影響しない)。
 * 期限のないプラン (success_fee / campaign_free) や未知の planType は対象外。
 */
export async function getPlanExpiredError(
  companyId: string
): Promise<string | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { planType: true, planPaidUntil: true },
  })
  if (!company) return "企業情報が見つかりません"
  const termPlan =
    company.planType === "monthly_12" ||
    company.planType === "monthly_24" ||
    company.planType === "sns_client"
  if (termPlan && !isPlanActive(company)) {
    return "ご契約プランの期間が終了しているため、求人を新しく公開できません。更新をご希望の場合は info@let-inc.net までお問い合わせください。"
  }
  return null
}
