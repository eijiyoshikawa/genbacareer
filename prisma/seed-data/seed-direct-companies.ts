/**
 * 直接掲載企業 (source = "direct") のサンプル seed。
 *
 * リリース直後の見栄えを整えるためのダミーデータ。
 * 本番では admin が手動で承認・編集する想定。
 *
 * 使い方:
 *   pnpm db:seed-companies          # 5 社追加
 *   pnpm db:seed-companies --reset  # 既存のサンプル削除後に追加
 *
 * すべて `source: "direct"` で `status: "approved"`。
 * 法人番号 / GbizINFO データは入れない（本番投入時に各社で登録）。
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

const COMPANIES = [
  {
    name: "株式会社サンプル建設",
    industry: "建築工事業",
    prefecture: "東京都",
    city: "新宿区",
    address: "西新宿1-1-1",
    employeeCount: "50-99",
    description:
      "東京都内を中心にオフィスビル・商業施設の新築・リノベーション工事を手がける総合建設会社です。創業 30 年の実績と若手育成プログラムが強みです。",
    websiteUrl: "https://example.com/sample-kensetsu",
    tagline: "若手が成長できる現場づくり",
    pitchHighlights:
      "・資格取得支援制度（受験料・教材費全額会社負担）\n・週休 2 日制（土日休み or 4 週 8 休）\n・社用車貸与（普通免許で運転可）\n・3 ヶ月の研修期間あり",
    idealCandidate:
      "建設業界の経験は不問。コツコツ作業が好きな方、長く働きたい方を歓迎。",
    employeeVoice:
      "未経験で入社しましたが、先輩がマンツーマンで現場の手順を教えてくれます。半年で 1 人で配筋までできるようになりました。(25 歳・男性)",
  },
  {
    name: "大阪土木興業株式会社",
    industry: "土木工事業",
    prefecture: "大阪府",
    city: "大阪市浪速区",
    address: "難波中2-1-1",
    employeeCount: "30-49",
    description:
      "関西エリアの公共インフラ工事（道路・橋梁・河川改修）を中心に請け負っています。国土交通省・大阪府からの直接受注が 8 割を占めます。",
    websiteUrl: "https://example.com/osaka-doboku",
    tagline: "公共工事で地域に貢献",
    pitchHighlights:
      "・国家資格取得への金銭補助あり\n・1 級土木施工管理技士保有者は月給 +5 万円\n・40 代未経験入社多数",
    idealCandidate:
      "体を動かす仕事が好きで、地図に残る仕事に魅力を感じる方。",
    employeeVoice:
      "前職は飲食でしたが、35 歳で転職して人生変わりました。残業も少なく、家族との時間が増えました。(38 歳・男性)",
  },
  {
    name: "ヤマダ電気工事株式会社",
    industry: "電気・設備工事業",
    prefecture: "神奈川県",
    city: "横浜市西区",
    address: "みなとみらい3-2-1",
    employeeCount: "20-29",
    description:
      "住宅・店舗の電気設備工事を専門に展開。第二種電気工事士の資格取得を全力でサポートします。",
    websiteUrl: "https://example.com/yamada-denki",
    tagline: "技術を磨きたい人を応援",
    pitchHighlights:
      "・電気工事士資格取得支援（試験対策講座無料）\n・移動はすべて社用車（個人車不要）\n・上場グループ企業との協業案件多数",
    idealCandidate:
      "細かい作業が苦にならない方、安定した職を求める方。",
    employeeVoice: "電気の知識ゼロから始めて 2 年で第一種電気工事士まで取れました。(28 歳・男性)",
  },
  {
    name: "九州内装デザイン株式会社",
    industry: "内装仕上工事業",
    prefecture: "福岡県",
    city: "福岡市中央区",
    address: "天神2-3-4",
    employeeCount: "10-19",
    description:
      "九州エリアのホテル・商業施設・オフィスの内装工事を手がけるデザイン会社。技術と感性を両立できる職人を育てます。",
    websiteUrl: "https://example.com/kyushu-naisou",
    tagline: "デザインと技術の融合",
    pitchHighlights:
      "・社内研修でデザインの基礎も学べる\n・有名ブランドの店舗内装案件多数\n・日給制 → 月給制への切替可",
    idealCandidate:
      "手先が器用で、ものづくりに興味がある方。",
    employeeVoice: "前職はアパレル販売員でしたが、自分の手で空間を作ることに惹かれて転職しました。(30 歳・女性)",
  },
  {
    name: "北海道解体サービス株式会社",
    industry: "解体工事業",
    prefecture: "北海道",
    city: "札幌市東区",
    address: "北24条東5丁目",
    employeeCount: "20-29",
    description:
      "札幌を中心に北海道全域で建物解体・アスベスト除去を手がけています。安全管理体制の徹底と石綿作業主任者の育成に力を入れています。",
    websiteUrl: "https://example.com/hokkaido-kaitai",
    tagline: "技術と安全をきわめる",
    pitchHighlights:
      "・解体作業に必要な特別教育（社内実施）\n・冬季は屋内作業中心で安心\n・寮完備（道外からの移住歓迎）",
    idealCandidate:
      "体力に自信があり、ルールを守れる方。年齢 18〜45 歳が中心。",
    employeeVoice: "東京から移住して 3 年。広い土地と空気の良さで体調も良くなりました。(32 歳・男性)",
  },
] as const

async function main() {
  const reset = process.argv.includes("--reset")

  if (reset) {
    console.log("[seed-companies] 既存のサンプル企業を削除中...")
    const deleted = await prisma.company.deleteMany({
      where: {
        websiteUrl: { startsWith: "https://example.com/" },
      },
    })
    console.log(`[seed-companies] ${deleted.count} 件削除`)
  }

  for (const data of COMPANIES) {
    const existing = await prisma.company.findFirst({
      where: { name: data.name },
      select: { id: true },
    })
    if (existing) {
      console.log(`[seed-companies] スキップ (既存): ${data.name}`)
      continue
    }

    const c = await prisma.company.create({
      data: {
        ...data,
        source: "direct",
        status: "approved",
      },
    })
    console.log(`[seed-companies] 追加: ${data.name} (${c.id})`)
  }

  const total = await prisma.company.count({
    where: { source: "direct", status: "approved" },
  })
  console.log(`\n[seed-companies] 完了 — direct/approved 企業数: ${total}`)
}

main()
  .catch((e) => {
    console.error("[seed-companies] error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
