/**
 * HelloWork 全国 36 万件取り込み用 ローテーションプランナー
 *
 * 役割:
 *   - 進捗テーブル `import_progress` を読み、次に取り込むべき (dataId, startPage) を決定する
 *   - dataId 一覧を API から取得し、未登録の dataId を進捗テーブルに upsert する
 *   - バッチ実行後に進捗を更新する
 *
 * ローテーション戦略:
 *   - exhausted=false の dataId のうち、lastRunAt が最も古い（または未実行）ものを選ぶ
 *   - 全 dataId が exhausted になったら一斉にリセットして次サイクルへ（=日次差分の取り直し）
 *
 * @module rotation-planner
 */
import type { PrismaClient } from "@prisma/client"
import { fetchDataIds } from "./hellowork"

const SOURCE = "hellowork"

/** プランナーが選んだ次バッチの実行計画 */
export interface RotationPlan {
  dataId: string
  startPage: number
  /** 連続して取得するページ数（呼び出し側がこの数だけ fetch する） */
  pagesPerRun: number
}

/**
 * 進捗テーブルを読み、次バッチの (dataId, startPage) を決定する。
 *
 * 進捗テーブルが空なら、API から dataId 一覧を取得して初期化する。
 *
 * @returns 次バッチの計画。全 dataId 完走済みの場合は新サイクルにリセットして1件目を返す。
 */
export async function planNextRotation(
  prisma: PrismaClient,
  pagesPerRun: number
): Promise<RotationPlan> {
  // 1. 進捗テーブルを最新化（dataId 一覧との差分を埋める）
  await ensureProgressRows(prisma)

  // 2. exhausted=false で最も古い lastRunAt の行を選ぶ
  let row = await prisma.importProgress.findFirst({
    where: { source: SOURCE, exhausted: false },
    orderBy: [{ lastRunAt: { sort: "asc", nulls: "first" } }, { dataId: "asc" }],
  })

  // 3. 全部 exhausted ならリセットして再選択
  if (!row) {
    console.info(
      "[rotation-planner] 全 dataId が exhausted。新サイクルとしてリセットします。"
    )
    await prisma.importProgress.updateMany({
      where: { source: SOURCE },
      data: { exhausted: false, lastPage: 0 },
    })
    row = await prisma.importProgress.findFirst({
      where: { source: SOURCE, exhausted: false },
      orderBy: [{ lastRunAt: { sort: "asc", nulls: "first" } }, { dataId: "asc" }],
    })
  }

  if (!row) {
    throw new Error(
      "[rotation-planner] 進捗テーブルが空です。HelloWork API から dataId が取得できているか確認してください。"
    )
  }

  return {
    dataId: row.dataId,
    startPage: row.lastPage + 1,
    pagesPerRun,
  }
}

/**
 * バッチ実行結果を進捗テーブルに反映する。
 */
export async function recordBatchResult(
  prisma: PrismaClient,
  params: {
    dataId: string
    /** 実際に最後まで取れたページ番号（fetchPagesFromDataId.lastPage） */
    lastPage: number
    /** 末尾ページに到達したか */
    exhausted: boolean
    /** このバッチで取得した件数 */
    fetched: number
  }
): Promise<void> {
  await prisma.importProgress.update({
    where: {
      source_dataId: { source: SOURCE, dataId: params.dataId },
    },
    data: {
      lastPage: params.lastPage,
      exhausted: params.exhausted,
      totalFetched: { increment: params.fetched },
      lastRunAt: new Date(),
    },
  })
}

// HelloWork API は深夜帯 (JST 01:00〜05:59) にデータを返さない。
// 本番ログで毎晩 16:00〜20:00 UTC の 5 回が「0 件」で完了しているのを確認
// (2026-11-10, 11-11)。空レスポンスを「dataId の末尾到達」と誤認して
// exhausted=true を立ててしまい、毎晩 5 dataId 分の残りページが
// そのサイクル中まるごと取り込まれなくなっていた。窓の間は API を叩かない。
const API_UNAVAILABLE_JST_HOURS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5])

export function isHelloworkQuietHour(now: Date = new Date()): boolean {
  const jstHour = (now.getUTCHours() + 9) % 24
  return API_UNAVAILABLE_JST_HOURS.has(jstHour)
}

/**
 * API がデータを返さなかった（一時不調）バッチを記録する。
 * lastPage / exhausted は変更せず lastRunAt のみ更新し、次の dataId へ回す。
 * 次の巡回で同じページから再開される。
 */
export async function recordRunWithoutProgress(
  prisma: PrismaClient,
  dataId: string
): Promise<void> {
  await prisma.importProgress.update({
    where: { source_dataId: { source: SOURCE, dataId } },
    data: { lastRunAt: new Date() },
  })
}

/**
 * dataId 一覧を API から取得し、`import_progress` に未登録のものを INSERT する。
 * 既存行の lastPage / exhausted は変更しない（毎日呼ばれても進捗を壊さない）。
 *
 * 進捗テーブルが完全に空のときだけ API を叩く。
 * （API 側の dataId は基本不変だが、新設に備えて週1回は同期する仕組みを後で足してもよい）
 */
async function ensureProgressRows(prisma: PrismaClient): Promise<void> {
  const count = await prisma.importProgress.count({ where: { source: SOURCE } })
  if (count > 0) return

  console.info("[rotation-planner] 進捗テーブルが空。dataId 一覧を取得します。")
  const dataIds = await fetchDataIds()
  if (dataIds.length === 0) {
    throw new Error(
      "[rotation-planner] HelloWork API から dataId を1件も取得できませんでした。"
    )
  }

  // createMany で一括 INSERT（重複はスキップ）
  await prisma.importProgress.createMany({
    data: dataIds.map((dataId) => ({
      source: SOURCE,
      dataId,
      lastPage: 0,
      exhausted: false,
      totalFetched: 0,
    })),
    skipDuplicates: true,
  })

  console.info(
    `[rotation-planner] 進捗テーブルに ${dataIds.length} 件の dataId を登録しました。`
  )
}

/**
 * 進捗テーブルに dataId を強制再同期する（管理者向け）。
 * 既存行は保持、不足分のみ追加する。
 */
export async function syncDataIds(prisma: PrismaClient): Promise<{
  added: number
  total: number
}> {
  const dataIds = await fetchDataIds()
  const existing = await prisma.importProgress.findMany({
    where: { source: SOURCE },
    select: { dataId: true },
  })
  const existingSet = new Set(existing.map((r) => r.dataId))
  const newOnes = dataIds.filter((d) => !existingSet.has(d))

  if (newOnes.length > 0) {
    await prisma.importProgress.createMany({
      data: newOnes.map((dataId) => ({
        source: SOURCE,
        dataId,
        lastPage: 0,
        exhausted: false,
        totalFetched: 0,
      })),
      skipDuplicates: true,
    })
  }

  return { added: newOnes.length, total: dataIds.length }
}
