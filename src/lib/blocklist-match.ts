/**
 * Blocklist（除外キーワード）とジョブ本文のマッチング判定。
 *
 * DB アクセスを含まない純粋関数として切り出し、クローラ取り込み側
 * (import-batch.ts) と admin プレビュー等の両方から使い回せるようにする。
 *
 * マッチ方式: keyword を対象テキストに大小文字を区別せず部分一致で含むか。
 * scope (Blocklist.scope) は "title" | "description" | "company" | "any"。
 */

export type BlocklistEntry = {
  id: string
  keyword: string
  scope: string
}

export type BlocklistTarget = {
  title: string
  description?: string | null
  companyName?: string | null
}

/**
 * enabled な Blocklist エントリの中から、対象求人にマッチする最初の 1 件を返す。
 * マッチしなければ null。
 */
export function matchBlocklist(
  entries: BlocklistEntry[],
  target: BlocklistTarget
): BlocklistEntry | null {
  const title = target.title.toLowerCase()
  const description = (target.description ?? "").toLowerCase()
  const companyName = (target.companyName ?? "").toLowerCase()

  for (const entry of entries) {
    const keyword = entry.keyword.trim().toLowerCase()
    if (!keyword) continue

    let hit: boolean
    switch (entry.scope) {
      case "title":
        hit = title.includes(keyword)
        break
      case "description":
        hit = description.includes(keyword)
        break
      case "company":
        hit = companyName.includes(keyword)
        break
      case "any":
      default:
        hit =
          title.includes(keyword) ||
          description.includes(keyword) ||
          companyName.includes(keyword)
    }

    if (hit) return entry
  }

  return null
}
