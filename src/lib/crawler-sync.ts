/**
 * 7.2 クローラ差分同期チェックポイント。
 *
 * クローラが取り込み時に呼ぶと CrawlerSyncCheckpoint テーブルへ進捗を記録。
 * 次回実行時に lastCursor / lastSyncedAt から差分のみ取得できる。
 *
 * admin は /admin/crawler-sync で各ソースの最終同期状況を確認できる。
 */

import { prisma } from "./db"

export interface SyncRunResult {
  source: string
  imported: number
  updated: number
  skipped: number
  errors: number
  cursor?: string | null
}

/**
 * 同期実行結果を CrawlerSyncCheckpoint に upsert。
 * 累計カウンタに加算する形で記録。
 */
export async function recordSyncRun(result: SyncRunResult): Promise<void> {
  const existing = await prisma.crawlerSyncCheckpoint
    .findUnique({ where: { source: result.source } })
    .catch(() => null)

  await prisma.crawlerSyncCheckpoint
    .upsert({
      where: { source: result.source },
      create: {
        source: result.source,
        lastSyncedAt: new Date(),
        lastCursor: result.cursor ?? null,
        totalImported: result.imported,
        totalUpdated: result.updated,
        totalSkipped: result.skipped,
        totalErrors: result.errors,
      },
      update: {
        lastSyncedAt: new Date(),
        lastCursor: result.cursor ?? null,
        totalImported: (existing?.totalImported ?? 0) + result.imported,
        totalUpdated: (existing?.totalUpdated ?? 0) + result.updated,
        totalSkipped: (existing?.totalSkipped ?? 0) + result.skipped,
        totalErrors: (existing?.totalErrors ?? 0) + result.errors,
      },
    })
    .catch((e) => {
      console.warn(
        `[crawler-sync] recordSyncRun failed: ${e instanceof Error ? e.message : e}`
      )
    })
}

/**
 * 指定ソースの最後の同期チェックポイントを取得。
 * クローラはこれを見て差分取得の開始位置を決める。
 */
export async function getCheckpoint(source: string) {
  return prisma.crawlerSyncCheckpoint
    .findUnique({ where: { source } })
    .catch(() => null)
}
