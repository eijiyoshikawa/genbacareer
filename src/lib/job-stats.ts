/**
 * カテゴリ件数集計の読み取りヘルパー。
 *
 * 直接 prisma.job.groupBy を実行してリアルタイム件数を返す。
 * （以前は materialized view `job_category_counts` を経由していたが、
 *  status="closed" 一括変更や hellowork import で MV が古くなり、
 *  ホームに「タクシー除外後」も古い件数が出る問題があったため取りやめ）
 *
 * idx_jobs_status_rank インデックスで status="active" 絞り込みは高速。
 * 8 カテゴリ × 数十万件でも 100ms 未満で完走する想定。
 * ホームの ISR キャッシュ (24h) + warmup cron でリアルタイム性も担保。
 */

import { prisma } from "@/lib/db"

export type CategoryCount = { category: string; count: number }

export async function getCategoryCounts(): Promise<CategoryCount[]> {
  try {
    const grouped = await prisma.job.groupBy({
      by: ["category"],
      where: { status: "active" },
      _count: true,
    })
    return grouped.map((g) => ({
      category: g.category,
      count: g._count ?? 0,
    }))
  } catch {
    return []
  }
}

/**
 * prefecture × category の集計（カテゴリページ用）。
 * 直接 groupBy でリアルタイム取得。
 */
export async function getPrefCategoryCounts(): Promise<
  Array<{ prefecture: string; category: string; count: number }>
> {
  try {
    const grouped = await prisma.job.groupBy({
      by: ["prefecture", "category"],
      where: { status: "active" },
      _count: true,
    })
    return grouped.map((g) => ({
      prefecture: g.prefecture,
      category: g.category,
      count: g._count ?? 0,
    }))
  } catch {
    return []
  }
}
