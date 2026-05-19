/**
 * /jobs の検索クエリと結果件数を記録するヘルパー。
 *
 * fire-and-forget で呼び出すため await しなくても OK。
 * void logSearch({ query, prefecture, category, resultCount })
 *
 * テーブルが未作成 (初回デプロイ直後) の場合は黙ってスキップする。
 */

import { prisma } from "./db"

export interface SearchLogInput {
  query?: string | null
  prefecture?: string | null
  category?: string | null
  resultCount: number
  sessionId?: string | null
}

const QUERY_MAX = 200

export function logSearch(input: SearchLogInput): void {
  // 完全 fire-and-forget (Promise を返さない)
  void (async () => {
    try {
      const trimmedQuery = input.query?.trim()
      // 空クエリ + 絞り込みなしのログは取らない (ノイズ削減)
      if (
        !trimmedQuery &&
        !input.prefecture &&
        !input.category
      ) {
        return
      }
      await prisma.searchLog.create({
        data: {
          query: trimmedQuery ? trimmedQuery.slice(0, QUERY_MAX) : null,
          prefecture: input.prefecture ?? null,
          category: input.category ?? null,
          resultCount: input.resultCount,
          sessionId: input.sessionId ?? null,
        },
      })
    } catch {
      // search_logs テーブル未作成 or 一時的エラー → 黙殺
    }
  })()
}
