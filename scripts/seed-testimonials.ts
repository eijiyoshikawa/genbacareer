/**
 * scripts/seed-testimonials.ts
 *
 * 利用者の声（体験談）を testimonials テーブルに投入する。
 * TOP の VOICE セクションに表示される（published=true）。
 *
 * 編集方法: 下の VOICES 配列を書き換えて実行。
 *
 *   # dry-run（投入内容の確認のみ）
 *   pnpm tsx --env-file=.env.local scripts/seed-testimonials.ts
 *
 *   # 実投入（既存を全削除して入れ替え）
 *   pnpm tsx --env-file=.env.local scripts/seed-testimonials.ts --apply
 *
 *   # 追記モード（既存を消さずに追加）
 *   pnpm tsx --env-file=.env.local scripts/seed-testimonials.ts --apply --append
 */

import { prisma } from "@/lib/db"

const apply = process.argv.includes("--apply")
const append = process.argv.includes("--append")

// ▼▼ ここを実際の声に書き換えてください ▼▼
const VOICES: Array<{ quote: string; who: string }> = [
  {
    quote:
      "未経験で入って1年。玉掛けと足場の資格を会社負担で取らせてもらい、給料も入社時より4万円上がりました。",
    who: "20代・鳶工",
  },
  {
    quote:
      "人間関係が良くて毎日が楽しい。職人として一生やっていける自信がつきました。",
    who: "30代・型枠大工",
  },
  {
    quote: "LINEで気軽に応募できたのが決め手。今は施工管理を目指して勉強中です。",
    who: "20代・施工管理",
  },
]
// ▲▲ ここまで ▲▲

async function main() {
  console.log(
    apply
      ? `🔴 APPLY MODE${append ? "（追記）" : "（全入れ替え）"}`
      : "🟡 DRY-RUN MODE（--apply で投入）"
  )
  console.log(`  投入件数: ${VOICES.length}\n`)
  VOICES.forEach((v, i) => console.log(`  ${i + 1}. [${v.who}] ${v.quote}`))

  if (!apply) {
    console.log("\n（--apply で実投入。--append で既存を消さずに追加）")
    return
  }

  if (!append) {
    const del = await prisma.testimonial.deleteMany({})
    console.log(`\n  既存 ${del.count} 件を削除`)
  }
  await prisma.testimonial.createMany({
    data: VOICES.map((v, i) => ({
      quote: v.quote,
      who: v.who,
      published: true,
      sortOrder: i,
    })),
  })
  const total = await prisma.testimonial.count()
  console.log(`  ✅ 投入完了。現在 published 含む全 ${total} 件`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
