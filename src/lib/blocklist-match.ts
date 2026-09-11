/**
 * 除外キーワード (Blocklist, 8.1) のマッチング判定。
 *
 * admin 画面 (/admin/blocklists) は以前からキーワードを登録できていたが、
 * これを実際に参照するコード (クローラ取り込み側) が一切存在せず、
 * admin が「これで今後この語を含む求人は取り込まれなくなる」と信じて
 * 登録しても、何も除外されないまま放置されていた（サイレントな機能未実装）。
 * HelloWork 取り込みバッチ (import-batch.ts) からここを呼び出す。
 */

import { prisma } from "@/lib/db"

export type BlocklistRule = {
  id: string
  keyword: string
  scope: string // any | title | description | company
}

/** 有効な除外ルールを取得する（バッチ実行のたびに 1 回だけ呼ぶ想定）。 */
export async function loadEnabledBlocklistRules(): Promise<BlocklistRule[]> {
  return prisma.blocklist.findMany({
    where: { enabled: true },
    select: { id: true, keyword: true, scope: true },
  })
}

/**
 * 求人がいずれかの除外ルールにマッチするか判定する。
 * 大文字小文字を区別しない部分一致。マッチした最初のルールを返す（無ければ null）。
 */
export function matchBlocklistRule(
  job: { title: string; description?: string | null; companyName?: string | null },
  rules: BlocklistRule[]
): BlocklistRule | null {
  if (rules.length === 0) return null
  const title = job.title.toLowerCase()
  const description = (job.description ?? "").toLowerCase()
  const companyName = (job.companyName ?? "").toLowerCase()

  for (const rule of rules) {
    const kw = rule.keyword.toLowerCase()
    if (!kw) continue
    let hit = false
    if (rule.scope === "title") hit = title.includes(kw)
    else if (rule.scope === "description") hit = description.includes(kw)
    else if (rule.scope === "company") hit = companyName.includes(kw)
    else hit = title.includes(kw) || description.includes(kw) || companyName.includes(kw)
    if (hit) return rule
  }
  return null
}

/**
 * マッチしたルールの hitCount をまとめて加算する。
 * バッチ処理中は Map<ruleId, count> に集計しておき、バッチ終了後に
 * まとめて呼ぶ（求人 1 件ごとに update すると N+1 になるため）。
 */
export async function incrementBlocklistHitCounts(
  hitCounts: Map<string, number>
): Promise<void> {
  await Promise.all(
    Array.from(hitCounts.entries()).map(([id, count]) =>
      prisma.blocklist
        .update({ where: { id }, data: { hitCount: { increment: count } } })
        .catch(() => {})
    )
  )
}
