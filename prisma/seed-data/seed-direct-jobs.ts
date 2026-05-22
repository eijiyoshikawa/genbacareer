/**
 * 直接掲載求人 (source = "direct") のサンプル seed。
 *
 * 先に pnpm db:seed-companies で企業を作成しておくこと。
 *
 * 使い方:
 *   pnpm db:seed-jobs           # 各 sample 企業に 2-3 件ずつ
 *   pnpm db:seed-jobs --reset   # 既存のサンプル削除後に追加
 *
 * 全求人 status=active で 30 日 expires。コンプラチェック警告に
 * 引っかからない表現で書いている。
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

type JobSeed = {
  companyName: string
  title: string
  category: string
  employmentType: "full_time" | "part_time" | "contract"
  description: string
  requirements: string
  salaryMin: number
  salaryMax: number
  salaryType: "monthly" | "hourly" | "annual"
  prefecture: string
  city?: string
  tags: string[]
  benefits: string[]
}

const JOBS: JobSeed[] = [
  // 株式会社サンプル建設
  {
    companyName: "株式会社サンプル建設",
    title: "鳶職／未経験OK・寮完備",
    category: "construction",
    employmentType: "full_time",
    description:
      "東京都内のオフィスビル新築現場で鳶職の作業を担当いただきます。最初は資材運びや清掃から、徐々に高所作業を学んでいただけます。資格取得支援・社内研修あり。",
    requirements: "普通自動車免許（AT 限定可）。建設業界経験不問。",
    salaryMin: 250000,
    salaryMax: 400000,
    salaryType: "monthly",
    prefecture: "東京都",
    city: "新宿区",
    tags: ["未経験OK", "資格取得支援", "寮あり", "週休2日", "社会保険完備"],
    benefits: ["社会保険完備", "資格手当", "通勤手当", "退職金制度", "寮完備"],
  },
  {
    companyName: "株式会社サンプル建設",
    title: "施工管理（中堅～ベテラン歓迎）",
    category: "management",
    employmentType: "full_time",
    description:
      "オフィスビル・商業施設の新築工事の施工管理をお任せします。工程・原価・品質・安全の 4 大管理を一貫して担当いただきます。プロジェクト規模 5〜20 億円。",
    requirements:
      "1 級建築施工管理技士保有者歓迎（2 級可）。施工管理経験 5 年以上。",
    salaryMin: 450000,
    salaryMax: 700000,
    salaryType: "monthly",
    prefecture: "東京都",
    city: "新宿区",
    tags: ["1級施工管理技士", "高収入", "完全週休2日"],
    benefits: ["社会保険完備", "資格手当", "役職手当", "退職金制度", "退職金"],
  },

  // 大阪土木興業
  {
    companyName: "大阪土木興業株式会社",
    title: "土木作業員／公共工事メイン",
    category: "civil",
    employmentType: "full_time",
    description:
      "大阪府・兵庫県の公共道路工事、橋梁補修、河川改修などを担当いただきます。経験者は重機オペレーターとしての配属も可能。安全第一の現場運営を徹底しています。",
    requirements: "普通自動車免許必須。土木の経験者歓迎（未経験可）。",
    salaryMin: 280000,
    salaryMax: 450000,
    salaryType: "monthly",
    prefecture: "大阪府",
    city: "大阪市浪速区",
    tags: ["未経験OK", "資格取得支援", "公共工事"],
    benefits: ["社会保険完備", "資格手当", "通勤手当", "賞与年 2 回"],
  },
  {
    companyName: "大阪土木興業株式会社",
    title: "1 級土木施工管理技士／管理職候補",
    category: "management",
    employmentType: "full_time",
    description:
      "国土交通省・大阪府発注の公共工事の現場代理人として、施工計画・工程管理・安全管理を統括していただきます。将来は工事部長候補。",
    requirements: "1 級土木施工管理技士必須。施工管理経験 7 年以上。",
    salaryMin: 500000,
    salaryMax: 800000,
    salaryType: "monthly",
    prefecture: "大阪府",
    city: "大阪市浪速区",
    tags: ["1級土木施工管理技士", "管理職候補", "高収入"],
    benefits: ["社会保険完備", "資格手当", "役職手当", "退職金", "賞与"],
  },

  // ヤマダ電気工事
  {
    companyName: "ヤマダ電気工事株式会社",
    title: "電気工事士／第二種から始めるキャリア",
    category: "electrical",
    employmentType: "full_time",
    description:
      "横浜・川崎を中心に住宅・店舗の電気工事を行います。第二種電気工事士の取得を全力でサポート。資格を取得すれば月給 +2 万円。",
    requirements: "普通自動車免許必須。第二種電気工事士、または取得意欲のある方。",
    salaryMin: 240000,
    salaryMax: 400000,
    salaryType: "monthly",
    prefecture: "神奈川県",
    city: "横浜市西区",
    tags: ["未経験OK", "資格取得支援", "電気工事士"],
    benefits: ["社会保険完備", "資格手当", "通勤手当", "社用車貸与"],
  },

  // 九州内装デザイン
  {
    companyName: "九州内装デザイン株式会社",
    title: "内装施工スタッフ／ホテル・店舗案件",
    category: "interior",
    employmentType: "full_time",
    description:
      "福岡市内のホテル・商業施設の内装工事（クロス貼り・床仕上げ・建具取付）を担当します。デザイン会社直営の現場で技術と感性を磨けます。",
    requirements: "普通自動車免許必須。経験不問。",
    salaryMin: 230000,
    salaryMax: 380000,
    salaryType: "monthly",
    prefecture: "福岡県",
    city: "福岡市中央区",
    tags: ["未経験OK", "週休2日", "土日休み"],
    benefits: ["社会保険完備", "資格取得支援", "通勤手当"],
  },

  // 北海道解体サービス
  {
    companyName: "北海道解体サービス株式会社",
    title: "解体作業員／寮完備・道外からの移住歓迎",
    category: "demolition",
    employmentType: "full_time",
    description:
      "札幌市内・近郊の建物解体作業を担当。重機オペレーター候補も歓迎。冬季は屋内作業中心で寒さの心配が少ない現場です。",
    requirements: "18 歳以上、普通自動車免許必須。",
    salaryMin: 260000,
    salaryMax: 380000,
    salaryType: "monthly",
    prefecture: "北海道",
    city: "札幌市東区",
    tags: ["未経験OK", "寮あり", "移住支援"],
    benefits: ["社会保険完備", "寮完備", "資格取得支援", "通勤手当"],
  },
] as const

async function main() {
  const reset = process.argv.includes("--reset")

  if (reset) {
    console.log("[seed-jobs] 既存のサンプル求人を削除中...")
    const sampleCompanies = await prisma.company.findMany({
      where: { websiteUrl: { startsWith: "https://example.com/" } },
      select: { id: true },
    })
    const deleted = await prisma.job.deleteMany({
      where: { companyId: { in: sampleCompanies.map((c) => c.id) } },
    })
    console.log(`[seed-jobs] ${deleted.count} 件削除`)
  }

  let added = 0
  for (const j of JOBS) {
    const company = await prisma.company.findFirst({
      where: { name: j.companyName },
      select: { id: true },
    })
    if (!company) {
      console.warn(
        `[seed-jobs] 企業 "${j.companyName}" が見つかりません。先に pnpm db:seed-companies を実行してください`
      )
      continue
    }

    // タイトル + 企業 ID で既存判定（同じものを 2 回入れないため）
    const existing = await prisma.job.findFirst({
      where: { companyId: company.id, title: j.title },
      select: { id: true },
    })
    if (existing) {
      console.log(`[seed-jobs] スキップ (既存): ${j.companyName} / ${j.title}`)
      continue
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    await prisma.job.create({
      data: {
        companyId: company.id,
        source: "direct",
        title: j.title,
        category: j.category,
        employmentType: j.employmentType,
        description: j.description,
        requirements: j.requirements,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        salaryType: j.salaryType,
        prefecture: j.prefecture,
        city: j.city,
        tags: [...j.tags],
        benefits: [...j.benefits],
        status: "active",
        publishedAt: now,
        expiresAt,
      },
    })
    added++
    console.log(`[seed-jobs] 追加: ${j.companyName} / ${j.title}`)
  }

  const total = await prisma.job.count({
    where: { status: "active", source: "direct" },
  })
  console.log(`\n[seed-jobs] 完了 — 追加 ${added} 件 / 全 direct/active: ${total}`)
}

main()
  .catch((e) => {
    console.error("[seed-jobs] error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
