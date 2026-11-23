/**
 * scripts/analyze-job-freshness.ts
 *
 * 求人の「鮮度」分布を分析し、expire 閾値・鮮度スコアの閾値最適化の判断材料を出す。
 * 読み取り専用（DB は変更しない）。
 *
 * 出力:
 *   - active 求人の publishedAt 経過日数の分布（source 別）
 *   - active 求人の expiresAt までの残日数の分布（過去/null 含む）
 *   - 「expiresAt が null（=期限切れで自動 close されない）」の件数 ← 公共求人の鮮度の要
 *
 * 実行:
 *   pnpm tsx --env-file=.env.local scripts/analyze-job-freshness.ts
 */

import { prisma } from "@/lib/db"

const DAY = 24 * 60 * 60 * 1000

async function main() {
  const now = new Date()
  const d = (days: number) => new Date(now.getTime() + days * DAY)

  const sources = ["direct", "hellowork"] as const

  console.info("=== active 求人 総数（source別）===")
  for (const source of sources) {
    const n = await prisma.job.count({ where: { status: "active", source } })
    console.info(`  ${source.padEnd(10)} ${n.toLocaleString()} 件`)
  }
  const totalActive = await prisma.job.count({ where: { status: "active" } })
  console.info(`  ${"合計".padEnd(8)} ${totalActive.toLocaleString()} 件`)

  // publishedAt 経過日数の分布
  console.info("\n=== publishedAt 経過日数の分布（active）===")
  const pubBuckets: Array<{ label: string; gte?: Date; lt?: Date }> = [
    { label: "0-3日", gte: d(-3) },
    { label: "4-7日", gte: d(-7), lt: d(-3) },
    { label: "8-14日", gte: d(-14), lt: d(-7) },
    { label: "15-30日", gte: d(-30), lt: d(-14) },
    { label: "31-90日", gte: d(-90), lt: d(-30) },
    { label: "91-180日", gte: d(-180), lt: d(-90) },
    { label: "180日超", lt: d(-180) },
  ]
  for (const b of pubBuckets) {
    const n = await prisma.job.count({
      where: {
        status: "active",
        publishedAt: {
          ...(b.gte ? { gte: b.gte } : {}),
          ...(b.lt ? { lt: b.lt } : {}),
        },
      },
    })
    console.info(`  ${b.label.padEnd(10)} ${n.toLocaleString().padStart(8)} 件`)
  }
  const pubNull = await prisma.job.count({
    where: { status: "active", publishedAt: null },
  })
  console.info(`  ${"publishedAt無".padEnd(10)} ${pubNull.toLocaleString().padStart(8)} 件`)

  // expiresAt 残日数の分布
  console.info("\n=== expiresAt 残日数の分布（active）===")
  const expBuckets: Array<{ label: string; gte?: Date; lt?: Date }> = [
    { label: "期限切れ(過去)", lt: now },
    { label: "0-3日", gte: now, lt: d(3) },
    { label: "4-7日", gte: d(3), lt: d(7) },
    { label: "8-14日", gte: d(7), lt: d(14) },
    { label: "15-30日", gte: d(14), lt: d(30) },
    { label: "30日超", gte: d(30) },
  ]
  for (const b of expBuckets) {
    const n = await prisma.job.count({
      where: {
        status: "active",
        expiresAt: {
          ...(b.gte ? { gte: b.gte } : {}),
          ...(b.lt ? { lt: b.lt } : {}),
        },
      },
    })
    console.info(`  ${b.label.padEnd(14)} ${n.toLocaleString().padStart(8)} 件`)
  }

  // expiresAt が null（自動 close されない）— source別
  console.info("\n=== expiresAt = null（期限なし＝自動closeされない）===")
  for (const source of sources) {
    const n = await prisma.job.count({
      where: { status: "active", source, expiresAt: null },
    })
    console.info(`  ${source.padEnd(10)} ${n.toLocaleString().padStart(8)} 件`)
  }

  console.info("\n※ 公共求人(hellowork)で expiresAt=null かつ publishedAt が古い件数が多い場合、")
  console.info("  「公開◯日経過で自動 close」する cron の追加を検討（閾値はこの分布から決定）。")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
