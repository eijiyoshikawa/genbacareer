/**
 * 8.4 重複求人検出・マージ。
 *
 * dedupeKey の算出方法:
 *   normalize(title) + "|" + companyId(or normalize会社名) + "|" + prefecture
 *   を SHA-1 ハッシュ (16 進 40 文字)。
 *
 * 同じ dedupeKey の active な求人が複数あれば、最も新しい publishedAt のものを
 * 代表として残し、他は status=closed + deduped_to に代表 id を入れて
 * 検索結果から消える。
 *
 * クローラ取り込み時にこのキーをセットしておけば、admin 一括処理で重複統合可能。
 */

import { createHash } from "node:crypto"
import { prisma } from "./db"

/** 正規化: 全角→半角、空白除去、小文字化、記号削除 */
function normalize(s: string): string {
  return s
    .normalize("NFKC")
    .replace(/[\s　]+/g, "")
    .replace(/[【】[\]()()「」『』《》〈〉、,.。!?！?・/\\|]/g, "")
    .toLowerCase()
}

/**
 * companyId も companyName も無い求人は null を返す (呼び出し側は dedupeKey を
 * セットしない)。両方無いジョブに固定の "?" プレースホルダを使うと、会社情報が
 * 欠落した無関係な求人同士がたまたま同じタイトル/都道府県というだけで同一キーに
 * なり、mergeDuplicates() で誤って片方を重複として閉じてしまう恐れがあるため。
 */
export function computeDedupeKey(input: {
  title: string
  companyId?: string | null
  companyName?: string | null
  prefecture: string
}): string | null {
  const companyN = input.companyId ?? (input.companyName ? normalize(input.companyName) : null)
  if (!companyN) return null
  const titleN = normalize(input.title)
  const prefN = normalize(input.prefecture)
  return createHash("sha1").update(`${titleN}|${companyN}|${prefN}`).digest("hex")
}

/**
 * 既存 active 求人の dedupeKey を一括計算して書き込む (50 件ずつ)。
 * admin から手動キック想定。
 */
export async function backfillDedupeKeys(limit = 100): Promise<number> {
  const rows = await prisma.job.findMany({
    where: {
      status: "active",
      dedupeKey: null,
    },
    select: {
      id: true,
      title: true,
      companyId: true,
      prefecture: true,
      company: { select: { name: true } },
    },
    take: limit,
  })

  let processed = 0
  for (const r of rows) {
    const key = computeDedupeKey({
      title: r.title,
      companyId: r.companyId,
      companyName: r.company?.name ?? null,
      prefecture: r.prefecture,
    })
    if (!key) continue
    await prisma.job
      .update({ where: { id: r.id }, data: { dedupeKey: key } })
      .then(() => processed++)
      .catch(() => {})
  }
  return processed
}

/**
 * dedupeKey が同じ active 求人グループを取得し、代表 1 件を残して
 * 他を closed + dedupedTo セットして「閉じる」。
 * 戻り値: closed にした件数。
 */
export async function mergeDuplicates(maxGroups = 50): Promise<{
  groupsProcessed: number
  closed: number
}> {
  // dedupeKey ごとに count > 1 のグループを抽出
  const groups = await prisma.$queryRawUnsafe<
    { dedupe_key: string; cnt: bigint }[]
  >(
    `SELECT "dedupe_key", COUNT(*)::bigint AS cnt
     FROM "jobs"
     WHERE status = 'active' AND "dedupe_key" IS NOT NULL
     GROUP BY "dedupe_key"
     HAVING COUNT(*) > 1
     LIMIT $1`,
    maxGroups
  )

  let closed = 0
  for (const g of groups) {
    const jobs = await prisma.job
      .findMany({
        where: { status: "active", dedupeKey: g.dedupe_key },
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        select: { id: true },
      })
      .catch(() => [])
    if (jobs.length < 2) continue
    const representative = jobs[0]
    const dupIds = jobs.slice(1).map((j) => j.id)
    const r = await prisma.job
      .updateMany({
        where: { id: { in: dupIds } },
        data: { status: "closed", dedupedTo: representative.id },
      })
      .catch(() => ({ count: 0 }))
    closed += r.count
  }

  return { groupsProcessed: groups.length, closed }
}
