/**
 * ポイント制度 / 抽選のコアロジック (2026-06)
 *
 * 求職者が「求人閲覧」「キャリア面談の完了」でポイントを貯め、抽選を回す。
 * 付与・消費はすべてサーバー側でのみ行い、クライアントの値は一切信用しない。
 *
 * 不正対策の要点:
 *   - 付与は PointLedger の (userId, dedupeKey) 一意制約で二重付与を DB で防ぐ
 *   - 残高は User.pointBalance にキャッシュし、台帳と同一トランザクションで更新
 *   - 各種上限（1日の閲覧獲得・抽選回数）をサーバー側で強制
 *
 * 法務上の前提:
 *   - ポイントは購入・現金化・譲渡いずれも不可（資金決済法の前払式支払手段に該当させない）
 *   - 景品額・当選確率は LotteryPrize で管理（景品表示法の表示義務に対応）
 */

import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"

/** 制度のパラメータ。運用しながら調整する想定でここに集約する。 */
export const POINT_RULES = {
  /** 求人 1 件の閲覧で得られるポイント（同一求人は 1 日 1 回まで）。 */
  viewJob: 1,
  /** 閲覧で 1 日に獲得できるポイントの上限。 */
  viewJobDailyCap: 10,
  /** キャリア面談 1 回の完了で得られるポイント。 */
  careerInterview: 50,
  /** 抽選 1 回に必要なポイント。 */
  lotteryCost: 30,
  /** 1 日に回せる抽選の上限回数。 */
  lotteryDailyCap: 5,
} as const

export type PointReason =
  | "view_job"
  | "career_interview"
  | "lottery_spend"
  | "admin_adjust"
  | "expire"

/** JST の「日付」キー（YYYY-MM-DD）。1 日上限・日次冪等キーに使う。 */
function jstDateKey(date: Date): string {
  // UTC+9。サーバーの TZ に依存せず JST 基準で日付を切る。
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

/** その日（JST）に reason で獲得済みのポイント合計。上限判定に使う。 */
async function sumAwardedToday(
  tx: Prisma.TransactionClient,
  userId: string,
  reason: PointReason,
  now: Date,
): Promise<number> {
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const startJst = new Date(jst.toISOString().slice(0, 10) + "T00:00:00Z")
  const startUtc = new Date(startJst.getTime() - 9 * 60 * 60 * 1000)
  const agg = await tx.pointLedger.aggregate({
    where: { userId, reason, delta: { gt: 0 }, createdAt: { gte: startUtc } },
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

export class PointError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
    this.name = "PointError"
  }
}

/**
 * 求人閲覧によるポイント付与。
 * - 同一 (user, job) は 1 日 1 回まで（dedupeKey の一意制約で保証）
 * - 1 日の閲覧獲得上限（viewJobDailyCap）を超える分は付与しない
 * 付与イベントの失敗が閲覧記録本体を壊さないよう、呼び出し側は失敗を握りつぶす。
 */
export async function awardJobViewPoints(
  userId: string,
  jobId: string,
  now = new Date(),
): Promise<number> {
  const dedupeKey = `view_job:${jobId}:${jstDateKey(now)}`
  return prisma.$transaction(async (tx) => {
    const todays = await sumAwardedToday(tx, userId, "view_job", now)
    if (todays >= POINT_RULES.viewJobDailyCap) return 0
    const grant = Math.min(
      POINT_RULES.viewJob,
      POINT_RULES.viewJobDailyCap - todays,
    )
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

/**
 * キャリア面談の完了によるポイント付与。CareerInterview を completed にして付与する。
 * pointsAwarded フラグと dedupeKey の二重ガードで冪等。
 */
export async function awardCareerInterviewPoints(
  interviewId: string,
): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const interview = await tx.careerInterview.findUnique({
      where: { id: interviewId },
    })
    if (!interview) {
      throw new PointError("NOT_FOUND", "面談が見つかりません")
    }
    if (interview.pointsAwarded) return 0
    const granted = await appendLedger(tx, {
      userId: interview.userId,
      delta: POINT_RULES.careerInterview,
      reason: "career_interview",
      dedupeKey: `career_interview:${interview.id}`,
      refId: interview.id,
    })
    await tx.careerInterview.update({
      where: { id: interview.id },
      data: {
        status: "completed",
        completedAt: interview.completedAt ?? new Date(),
        pointsAwarded: true,
      },
    })
    return granted
  })
}

/** 管理者による手動調整（プラスマイナス両対応）。 */
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

/**
 * 抽選を 1 回実行する。ポイント消費・在庫減算・結果記録を 1 トランザクションで原子的に行う。
 * - 残高不足 / 1 日上限超過 / 景品未設定はエラー
 * - weight に応じた重み付き抽選。在庫切れ景品は対象外。
 */
export async function drawLottery(
  userId: string,
  now = new Date(),
): Promise<LotteryResult> {
  return prisma.$transaction(async (tx) => {
    // 1 日の抽選回数上限
    const startUtc = new Date(
      new Date(jstDateKey(now) + "T00:00:00Z").getTime() - 9 * 60 * 60 * 1000,
    )
    const todayDraws = await tx.lotteryDraw.count({
      where: { userId, createdAt: { gte: startUtc } },
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
export async function getPointsSummary(userId: string) {
  const [user, history, prizes] = await Promise.all([
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
  ])
  return {
    balance: user?.pointBalance ?? 0,
    history,
    prizes,
    rules: POINT_RULES,
    canDraw: (user?.pointBalance ?? 0) >= POINT_RULES.lotteryCost,
  }
}

/** 付与/消費理由の日本語ラベル。 */
export const REASON_LABELS: Record<string, string> = {
  view_job: "求人閲覧",
  career_interview: "キャリア面談",
  lottery_spend: "抽選",
  admin_adjust: "運営による調整",
  expire: "失効",
}
