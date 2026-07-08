/**
 * 企業 → 求職者へスカウトメッセージを送信。
 *
 * POST /api/company/scouts
 * - 認証: company_admin / company_member セッション必須
 * - Body: { jobId: UUID, userId: UUID, body: 20〜2000 文字 }
 * - 件名はサーバ側で固定書式生成 (企業はカスタマイズ不可)
 * - (companyId, jobId, userId) で active scout が既にあれば 409 (DB 側 partial unique index で保証)
 * - 求人が active / 求職者が searching|employed_open でなければ 400
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
} from "@/lib/scouts"
import { sendScoutEmail } from "@/lib/email"
import { parsePrefs } from "@/lib/notification-prefs"
import { canSendScoutByPlan, isPlanActive } from "@/lib/plans"

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
      notificationPrefs: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: "求職者が見つかりません" }, { status: 404 })
  }

  if (!canSendScout({ job, user })) {
    return NextResponse.json(
      { error: "送信対象が条件を満たしていません (求人 active / 求職者 active+searching/employed_open)" },
      { status: 400 },
    )
  }

  // 2.5 重複送信チェック（アプリケーション層の保険）。
  // 本来は DB 側の partial unique index (scout_messages_active_unique,
  // prisma/migrations/manual/scout_messages.sql) が保証するが、そのマイグレーション
  // は `prisma migrate` の管理外で手動実行が必要なため、未適用の環境（新規 DB や
  // `prisma db push` のみで構築した環境）では index が存在せず重複が素通りしてしまう。
  // ここでの事前チェックは同時リクエストの完全なレースは防げないが、通常の
  // 二重クリック等は防止できる。
  const existingActive = await prisma.scoutMessage.findFirst({
    where: {
      companyId: auth.companyId,
      jobId,
      userId,
      status: { notIn: ["expired", "declined"] },
    },
    select: { id: true },
  })
  if (existingActive) {
    return NextResponse.json(
      { error: "この求職者には既にアクティブなスカウトが送信済みです" },
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

  // 4. サイト内通知 (Notification) を作成
  await prisma.notification.create({
    data: {
      userId,
      type: "scout",
      title: `${job.company?.name ?? "企業"}からスカウトが届きました`,
      body: buildScoutExcerpt(body, 80),
      linkUrl: `/mypage/scouts/${scout.id}`,
      refId: scout.id,
    },
  }).catch((err) => {
    console.error("[scouts] Notification create failed:", err)
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
