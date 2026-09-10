/**
 * 企業 → 求職者へスカウトメッセージを送信。
 *
 * POST /api/company/scouts
 * - 認証: company_admin / company_member セッション必須
 * - Body: { jobId: UUID, userId: UUID, body: 20〜2000 文字 }
 * - 件名はサーバ側で固定書式生成 (企業はカスタマイズ不可)
 * - (companyId, jobId, userId) で active scout が既にあれば 409 (DB 側 partial unique index で保証)
 * - 求人が active / 求職者が searching|employed_open / profilePublic=true /
 *   自社を blockedCompanyIds に含んでいない、でなければ 400
 * - 直近 30 日以内にこの求職者から辞退 (declined) されていれば 409（再送クールダウン）
 * - 1 企業あたり 50 件/日のレート制限（大量一斉スカウト防止）
 * - 求職者の notificationPrefs.scoutEnabled が false なら DB 記録のみ、メール送信は skip
 *
 * GET /api/company/scouts
 * - 自社の送信履歴を新しい順に最大 100 件
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  scoutInputSchema,
  buildScoutExpiry,
  buildScoutSubject,
  buildScoutExcerpt,
  canSendScout,
  SCOUT_RESCOUT_COOLDOWN_DAYS,
} from "@/lib/scouts"
import { sendScoutEmail } from "@/lib/email"
import { parsePrefs } from "@/lib/notification-prefs"
import { canSendScoutByPlan, isPlanActive } from "@/lib/plans"
import { createNotification } from "@/lib/notifications"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

/** 1 企業あたりの日次スカウト送信上限。大量一斉スカウトによる求職者への迷惑を抑止する。 */
const DAILY_SCOUT_LIMIT = 50

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SessionUser = {
  id?: string
  companyId?: string
  role?: string
}

async function requireCompanyUser() {
  const session = await auth()
  if (!session?.user) return null
  const u = session.user as SessionUser
  if (!u.companyId) return null
  if (u.role !== "company_admin" && u.role !== "company_member") return null
  return { userId: u.id ?? null, companyId: u.companyId }
}

export async function POST(request: NextRequest) {
  const auth = await requireCompanyUser()
  if (!auth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  // 大量一斉スカウト（DB 内の全ユーザーへの spam）を防ぐ日次上限。
  // canSendScout の各種チェック（プラン・求人・求職者状態）はどれも
  // 「1 件ずつは正当」なリクエストを弾く仕組みではないため、件数自体を
  // 制限する歯止めがこれまで存在しなかった。
  const rl = checkRateLimit({
    key: `scout-send:${auth.companyId}`,
    limit: DAILY_SCOUT_LIMIT,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON が不正です" }, { status: 400 })
  }

  const parsed = scoutInputSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "入力エラー",
        issues: parsed.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 },
    )
  }

  const { jobId, userId, body } = parsed.data

  // 1. 求人が自社所有 + active であることを確認
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      title: true,
      companyId: true,
      company: {
        select: { name: true, planType: true, planPaidUntil: true },
      },
    },
  })
  if (!job || job.companyId !== auth.companyId) {
    return NextResponse.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  // プラン適格性チェック (C2-C8 連動)
  if (!canSendScoutByPlan(job.company?.planType)) {
    return NextResponse.json(
      {
        error:
          "現在のプランではスカウト送信できません (キャンペーン枠は対象外)",
      },
      { status: 403 },
    )
  }
  if (
    !isPlanActive({
      planType: job.company?.planType,
      planPaidUntil: job.company?.planPaidUntil,
    })
  ) {
    return NextResponse.json(
      { error: "プランが期限切れです。契約更新をお願いします" },
      { status: 403 },
    )
  }

  // 2. 求職者の状態 + 通知設定を取得
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      jobSearchStatus: true,
      profilePublic: true,
      blockedCompanyIds: true,
      notificationPrefs: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: "求職者が見つかりません" }, { status: 404 })
  }

  if (!canSendScout({ job, user, companyId: auth.companyId })) {
    return NextResponse.json(
      { error: "送信対象が条件を満たしていません (求人 active / 求職者 active+searching/employed_open)" },
      { status: 400 },
    )
  }

  // 辞退後クールダウン: 同じ求職者から直近 N 日以内に辞退 (declined) された
  // 履歴があれば再送不可（求人を変えての即再送も含めて防ぐ）。以前は
  // active スカウトの重複防止 (partial unique index) しかなく、辞退直後に
  // 何度でも別求人でスカウトを送り直せてしまっていた。
  const cooldownSince = new Date(
    Date.now() - SCOUT_RESCOUT_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
  )
  const recentDecline = await prisma.scoutMessage.findFirst({
    where: {
      companyId: auth.companyId,
      userId,
      status: "declined",
      updatedAt: { gte: cooldownSince },
    },
    select: { id: true },
  })
  if (recentDecline) {
    return NextResponse.json(
      {
        error: `この求職者は直近 ${SCOUT_RESCOUT_COOLDOWN_DAYS} 日以内にスカウトを辞退しています。しばらく時間を置いてから再度お試しください`,
      },
      { status: 409 },
    )
  }

  // 3. スカウト本体を作成
  const sentAt = new Date()
  const expiresAt = buildScoutExpiry(sentAt)
  const subject = buildScoutSubject(job.company?.name ?? "企業")

  let scout
  try {
    scout = await prisma.scoutMessage.create({
      data: {
        companyId: auth.companyId,
        jobId,
        userId,
        companyUserId: auth.userId,
        subject,
        body,
        status: "sent",
        sentAt,
        expiresAt,
      },
    })
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "この求職者には既にアクティブなスカウトが送信済みです" },
        { status: 409 },
      )
    }
    throw e
  }

  // 4. サイト内通知 (Notification) を作成 + (opt-in なら) LINE push
  // 他の通知種別 (application_status 等) と同じく createNotification 経由にする。
  // 直接 prisma.notification.create するとサイト内通知は記録されるが、
  // LINE 即時配信が一切発火しない（scoutEnabled=false でメールを止めている
  // 求職者は、LINE も未対応だと期限切れまで気づけない）。
  await createNotification({
    userId,
    type: "scout",
    title: `${job.company?.name ?? "企業"}からスカウトが届きました`,
    body: buildScoutExcerpt(body, 80),
    linkUrl: `/mypage/scouts/${scout.id}`,
    linkLabel: "スカウトを見る",
    refId: scout.id,
  })

  // 5. opt-in なら メール送信 (失敗は throw しない、ログのみ)
  const prefs = parsePrefs(user.notificationPrefs)
  const shouldEmail = prefs.scoutEnabled && prefs.emailEnabled && !!user.email
  if (shouldEmail && user.email) {
    try {
      await sendScoutEmail({
        to: user.email,
        userName: user.name ?? "求職者",
        companyName: job.company?.name ?? "企業",
        jobTitle: job.title,
        subject,
        bodyExcerpt: buildScoutExcerpt(body),
        scoutId: scout.id,
        expiresAt,
      })
      await prisma.scoutMessage.update({
        where: { id: scout.id },
        data: { emailSentAt: new Date() },
      })
    } catch (err) {
      console.error("[scouts] sendScoutEmail failed:", err)
    }
  }

  return NextResponse.json({ scoutId: scout.id, expiresAt }, { status: 201 })
}

export async function GET() {
  const auth = await requireCompanyUser()
  if (!auth) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const scouts = await prisma.scoutMessage.findMany({
    where: { companyId: auth.companyId },
    orderBy: { sentAt: "desc" },
    take: 100,
    select: {
      id: true,
      jobId: true,
      userId: true,
      subject: true,
      status: true,
      sentAt: true,
      readAt: true,
      expiresAt: true,
      job: { select: { title: true } },
      user: { select: { name: true } },
    },
  })

  return NextResponse.json({ scouts })
}
