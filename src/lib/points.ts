/**
 * ポイント制度 / 抽選のコアロジック (2026-06)
 *
 * 求職者が「初回登録 / ログイン / 求人閲覧 / キャリア面談」でポイントを貯め、抽選を回す。
 * 付与・消費はすべてサーバー側でのみ行い、クライアントの値は一切信用しない。
 *
 * 付与ルール:
 *   - 初回登録ボーナス: +10pt（1回のみ・日次上限の対象外）
 *   - ログインボーナス: +3pt（1日1回・日次上限に含める）
 *   - 求人閲覧: +1pt/件（同一求人は1日1回・10秒以上滞在が条件・日次上限に含める）
 *   - 日次上限: ログインボーナス＋閲覧の合算で 1日 10pt まで
 *   - キャリア面談完了: +50pt（日次上限の対象外 / 7日に1回 / 同一企業では再付与しない）
 *
 * 抽選:
 *   - 30pt 消費で1回 / 1日2回まで
 *   - 当選景品（Amazon ギフト等）の在庫が尽きると抽選自体を停止（ポイントは貯められるが回せない）
 *
 * 法務上の前提:
 *   - ポイントは購入・現金化・譲渡いずれも不可（資金決済法の前払式支払手段に該当させない）
 *   - 景品額・当選確率・当選数上限・提供条件は利用規約に明記（景品表示法対応）
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

/** 制度のパラメータ。運用しながら調整する想定でここに集約する。 */
export const POINT_RULES = {
  /** 初回登録ボーナス（1回のみ・日次上限の対象外）。 */
  signupBonus: 10,
  /** ログインボーナス（1日1回・日次上限に含める）。 */
  loginBonus: 3,
  /** 求人 1 件の閲覧で得られるポイント（同一求人は 1 日 1 回まで）。 */
  viewJob: 1,
  /** 閲覧ポイント付与に必要な最低滞在時間（ミリ秒）。 */
  viewDwellMs: 10_000,
  /** 1 日に獲得できるポイント上限（ログインボーナス＋閲覧の合算）。 */
  dailyEarnCap: 10,
  /** キャリア面談 1 回の完了で得られるポイント（日次上限の対象外）。 */
  careerInterview: 50,
  /** 面談ポイントの付与間隔（この日数内に既付与があれば付与しない）。 */
  careerInterviewCooldownDays: 7,
  /** 抽選 1 回に必要なポイント。 */
  lotteryCost: 30,
  /** 1 日に回せる抽選の上限回数。 */
  lotteryDailyCap: 2,
} as const

/** 日次上限の対象となる付与理由（ログインボーナスと閲覧）。 */
const DAILY_CAPPED_REASONS = ["view_job", "login"] as const

export type PointReason =
  | "signup"
  | "login"
  | "view_job"
  | "career_interview"
  | "lottery_spend"
  | "admin_adjust"
  | "expire"

export class PointError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = "PointError"
  }
}

/** JST の「日付」キー（YYYY-MM-DD）。1 日上限・日次冪等キーに使う。 */
function jstDateKey(date: Date): string {
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

/** JST のその日 0:00 を UTC の Date で返す。 */
function jstStartOfDayUtc(now: Date): Date {
  return new Date(
    new Date(jstDateKey(now) + "T00:00:00Z").getTime() - 9 * 60 * 60 * 1000,
  )
}

/** その日（JST）に日次上限対象の理由で獲得済みのポイント合計。 */
async function sumDailyCappedToday(
  tx: Prisma.TransactionClient,
  userId: string,
  now: Date,
): Promise<number> {
  const agg = await tx.pointLedger.aggregate({
    where: {
      userId,
      reason: { in: [...DAILY_CAPPED_REASONS] },
      delta: { gt: 0 },
      createdAt: { gte: jstStartOfDayUtc(now) },
    },
    _sum: { delta: true },
  })
  return agg._sum.delta ?? 0
}

/**
 * 台帳に 1 行追加し、残高キャッシュを更新する。冪等キー重複は無視（既付与）。
 * 必ずトランザクション内で呼ぶこと。戻り値は実際に付与/消費した delta（0=スキップ）。
 */
async function appendLedger(
  tx: Prisma.TransactionClient,
  args: {
    userId: string
    delta: number
    reason: PointReason
    dedupeKey?: string | null
    refId?: string | null
  },
): Promise<number> {
  const user = await tx.user.findUnique({
    where: { id: args.userId },
    select: { pointBalance: true },
  })
  if (!user) return 0
  const newBalance = user.pointBalance + args.delta
  if (newBalance < 0) {
    throw new PointError("INSUFFICIENT_BALANCE", "ポイントが不足しています")
  }
  try {
    await tx.pointLedger.create({
      data: {
        userId: args.userId,
        delta: args.delta,
        reason: args.reason,
        dedupeKey: args.dedupeKey ?? null,
        refId: args.refId ?? null,
        balance: newBalance,
      },
    })
  } catch (e) {
    // 冪等キー重複（既に付与済み）は正常系としてスキップ
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return 0
    }
    throw e
  }
  await tx.user.update({
    where: { id: args.userId },
    data: { pointBalance: newBalance },
  })
  return args.delta
}

/**
 * 初回登録ボーナス。ユーザーにつき 1 回のみ（dedupeKey で保証）。日次上限の対象外。
 */
export async function awardSignupBonus(userId: string): Promise<number> {
  return prisma.$transaction((tx) =>
    appendLedger(tx, {
      userId,
      delta: POINT_RULES.signupBonus,
      reason: "signup",
      dedupeKey: "signup",
    }),
  )
}

/**
 * ログインボーナス。1 日 1 回（dedupeKey=login:<日付>）。日次上限に含める。
 * その日すでに上限に達していれば残り枠だけ付与（0 もありうる）。
 */
export async function awardDailyLoginBonus(
  userId: string,
  now = new Date(),
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const todays = await sumDailyCappedToday(tx, userId, now)
    const grant = Math.min(POINT_RULES.loginBonus, POINT_RULES.dailyEarnCap - todays)
    if (grant <= 0) return 0
    return appendLedger(tx, {
      userId,
      delta: grant,
      reason: "login",
      dedupeKey: `login:${jstDateKey(now)}`,
    })
  })
}

/**
 * 求人閲覧によるポイント付与（呼び出し側で 10 秒以上の滞在を確認済みであること）。
 * - 同一 (user, job) は 1 日 1 回まで（dedupeKey の一意制約で保証）
 * - ログインボーナスと合算で 1 日 dailyEarnCap を超える分は付与しない
 */
export async function awardJobViewPoints(
  userId: string,
  jobId: string,
  now = new Date(),
): Promise<number> {
  const dedupeKey = `view_job:${jobId}:${jstDateKey(now)}`
  return prisma.$transaction(async (tx) => {
    const todays = await sumDailyCappedToday(tx, userId, now)
    const grant = Math.min(POINT_RULES.viewJob, POINT_RULES.dailyEarnCap - todays)
    if (grant <= 0) return 0
    return appendLedger(tx, {
      userId,
      delta: grant,
      reason: "view_job",
      dedupeKey,
      refId: jobId,
    })
  })
}

export type InterviewAwardResult = {
  granted: number
  /** awarded | already | weekly_capped | same_company */
  reason: string
}

/** 企業名の正規化（前後空白除去・小文字化）。同一企業判定に使う。 */
function normalizeCompany(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase()
}

/**
 * キャリア面談の完了によるポイント付与。
 * - 7 日以内に既に面談ポイントを得ていれば付与しない（クールダウン）
 * - 同一企業の面談では再付与しない
 * - 上記いずれも、面談自体は completed として記録する
 */
export async function awardCareerInterviewPoints(
  interviewId: string,
  now = new Date(),
): Promise<InterviewAwardResult> {
  return prisma.$transaction(async (tx) => {
    const interview = await tx.careerInterview.findUnique({
      where: { id: interviewId },
    })
    if (!interview) {
      throw new PointError("NOT_FOUND", "面談が見つかりません")
    }

    const markCompleted = (awarded: boolean) =>
      tx.careerInterview.update({
        where: { id: interview.id },
        data: {
          status: "completed",
          completedAt: interview.completedAt ?? now,
          pointsAwarded: awarded ? true : interview.pointsAwarded,
        },
      })

    if (interview.pointsAwarded) {
      return { granted: 0, reason: "already" }
    }

    // 7 日クールダウン: 直近に面談ポイントの付与があれば付与しない
    const cooldownStart = new Date(
      now.getTime() - POINT_RULES.careerInterviewCooldownDays * 24 * 60 * 60 * 1000,
    )
    const recent = await tx.pointLedger.findFirst({
      where: {
        userId: interview.userId,
        reason: "career_interview",
        delta: { gt: 0 },
        createdAt: { gte: cooldownStart },
      },
      select: { id: true },
    })
    if (recent) {
      await markCompleted(false)
      return { granted: 0, reason: "weekly_capped" }
    }

    // 同一企業では再付与しない（過去に付与済みの同名企業面談があるか）
    const company = normalizeCompany(interview.companyName)
    if (company) {
      const sameCompany = await tx.careerInterview.findFirst({
        where: {
          userId: interview.userId,
          pointsAwarded: true,
          id: { not: interview.id },
          companyName: { equals: interview.companyName ?? undefined, mode: "insensitive" },
        },
        select: { id: true },
      })
      if (sameCompany) {
        await markCompleted(false)
        return { granted: 0, reason: "same_company" }
      }
    }

    const granted = await appendLedger(tx, {
      userId: interview.userId,
      delta: POINT_RULES.careerInterview,
      reason: "career_interview",
      dedupeKey: `career_interview:${interview.id}`,
      refId: interview.id,
    })
    await markCompleted(true)
    return { granted, reason: "awarded" }
  })
}

/** 管理者による手動調整（プラスマイナス両対応・日次上限の対象外）。 */
export async function adjustPoints(
  userId: string,
  delta: number,
  note: string,
): Promise<number> {
  return prisma.$transaction((tx) =>
    appendLedger(tx, {
      userId,
      delta,
      reason: "admin_adjust",
      refId: note.slice(0, 64),
    }),
  )
}

export type LotteryResult = {
  isWin: boolean
  prizeName: string
  prizeId: string | null
  kind: string
  balance: number
  drawId: string
}

/** 当選可能な在庫（ハズレ以外で在庫が残っている景品）が存在するか。 */
async function hasWinnableStock(
  client: Prisma.TransactionClient | typeof prisma,
): Promise<boolean> {
  const n = await client.lotteryPrize.count({
    where: {
      active: true,
      kind: { not: "none" },
      OR: [{ stock: null }, { stock: { gt: 0 } }],
    },
  })
  return n > 0
}

/**
 * 抽選を 1 回実行する。ポイント消費・在庫減算・結果記録を 1 トランザクションで原子的に行う。
 * - 当選景品の在庫が無ければ LOTTERY_CLOSED（ポイントは消費しない＝貯められるが回せない）
 * - 残高不足 / 1 日上限超過はエラー
 * - weight に応じた重み付き抽選。在庫切れ景品は対象外。
 */
export async function drawLottery(
  userId: string,
  now = new Date(),
): Promise<LotteryResult> {
  return prisma.$transaction(async (tx) => {
    // 当選景品の在庫切れ時は抽選を停止（ポイントは消費しない）
    if (!(await hasWinnableStock(tx))) {
      throw new PointError(
        "LOTTERY_CLOSED",
        "現在抽選を受け付けていません（景品の準備中）。ポイントは引き続き貯められます",
      )
    }

    // 1 日の抽選回数上限
    const todayDraws = await tx.lotteryDraw.count({
      where: { userId, createdAt: { gte: jstStartOfDayUtc(now) } },
    })
    if (todayDraws >= POINT_RULES.lotteryDailyCap) {
      throw new PointError(
        "DAILY_LIMIT",
        `本日の抽選上限（${POINT_RULES.lotteryDailyCap} 回）に達しました`,
      )
    }

    // ポイント消費（残高不足は appendLedger が INSUFFICIENT_BALANCE を投げる）
    await appendLedger(tx, {
      userId,
      delta: -POINT_RULES.lotteryCost,
      reason: "lottery_spend",
      refId: null,
    })

    // 抽選対象（active かつ在庫あり）を取得し重み付き抽選
    const prizes = await tx.lotteryPrize.findMany({
      where: {
        active: true,
        OR: [{ stock: null }, { stock: { gt: 0 } }],
      },
    })
    const totalWeight = prizes.reduce((s, p) => s + Math.max(0, p.weight), 0)
    if (prizes.length === 0 || totalWeight <= 0) {
      throw new PointError("NO_PRIZES", "現在抽選を受け付けていません")
    }

    // [0, totalWeight) の整数で抽選（乱数は実行時のみ生成）
    let r = Math.floor(Math.random() * totalWeight)
    let chosen = prizes[prizes.length - 1]
    for (const p of prizes) {
      r -= Math.max(0, p.weight)
      if (r < 0) {
        chosen = p
        break
      }
    }

    const isWin = chosen.kind !== "none"
    // 当選景品の在庫を減算
    if (isWin && chosen.stock !== null) {
      await tx.lotteryPrize.update({
        where: { id: chosen.id },
        data: { stock: { decrement: 1 } },
      })
    }

    const balanceRow = await tx.user.findUnique({
      where: { id: userId },
      select: { pointBalance: true },
    })

    const draw = await tx.lotteryDraw.create({
      data: {
        userId,
        cost: POINT_RULES.lotteryCost,
        prizeId: isWin ? chosen.id : null,
        prizeName: chosen.name,
        isWin,
        // 金券/実物は運用で発行 → pending。特典/ハズレは not_applicable。
        fulfillment:
          isWin && (chosen.kind === "amazon_gift" || chosen.kind === "physical")
            ? "pending"
            : "not_applicable",
      },
    })

    return {
      isWin,
      prizeName: chosen.name,
      prizeId: isWin ? chosen.id : null,
      kind: chosen.kind,
      balance: balanceRow?.pointBalance ?? 0,
      drawId: draw.id,
    }
  })
}

/** マイページ表示用: 残高・履歴・抽選可否などをまとめて取得。 */
export async function getPointsSummary(userId: string, now = new Date()) {
  const [user, history, prizes, drawsToday, winnable] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { pointBalance: true },
    }),
    prisma.pointLedger.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        delta: true,
        reason: true,
        balance: true,
        createdAt: true,
      },
    }),
    prisma.lotteryPrize.findMany({
      where: { active: true, kind: { not: "none" } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true, kind: true, valueJpy: true, stock: true },
    }),
    prisma.lotteryDraw.count({
      where: { userId, createdAt: { gte: jstStartOfDayUtc(now) } },
    }),
    hasWinnableStock(prisma),
  ])
  const balance = user?.pointBalance ?? 0
  const drawsRemaining = Math.max(0, POINT_RULES.lotteryDailyCap - drawsToday)
  return {
    balance,
    history,
    prizes,
    rules: POINT_RULES,
    lotteryOpen: winnable,
    drawsRemaining,
    canDraw:
      balance >= POINT_RULES.lotteryCost && winnable && drawsRemaining > 0,
  }
}

/** 付与/消費理由の日本語ラベル。 */
export const REASON_LABELS: Record<string, string> = {
  signup: "初回登録ボーナス",
  login: "ログインボーナス",
  view_job: "求人閲覧",
  career_interview: "キャリア面談",
  lottery_spend: "抽選",
  admin_adjust: "運営による調整",
  expire: "失効",
}
