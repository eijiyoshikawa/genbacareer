/**
 * scripts/seed-demo-accounts.ts
 *
 * 仮の デモ企業アカウント + デモ求職者アカウント を生成する。
 *
 * 実行方法:
 *   pnpm tsx --env-file=.env.local scripts/seed-demo-accounts.ts
 *
 * 冪等: 既に同じ email のアカウントがあれば updateOrCreate でパスワードと内容を更新する。
 * 何度実行しても結果は同じ。
 *
 * 出力に表示されるパスワードはコンソールに 1 度だけ表示される。控えてください。
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

// .env.local を自前ロード（tsx は自動ロードしない）
function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = join(process.cwd(), file)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const t = line.trim()
      if (!t || t.startsWith("#")) continue
      const eq = t.indexOf("=")
      if (eq < 0) continue
      const k = t.slice(0, eq).trim()
      let v = t.slice(eq + 1).trim()
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1)
      }
      if (process.env[k] === undefined) process.env[k] = v
    }
  }
}
loadDotEnv()

// ============================================================
// 設定
// ============================================================
const COMPANY_EMAIL = "demo-company@genbacareer.jp"
const SEEKER_EMAIL = "demo-seeker@genbacareer.jp"
const COMMON_PASSWORD = "GenbaDemo2025!"

const DEMO_COMPANY_NAME = "デモ建設株式会社"

async function main() {
  // 動的 import: loadDotEnv() の後に Prisma を読み込む（接続文字列を確実に反映）。
  // トップレベル await を避けるため main 内で import する。
  const { prisma } = await import("../src/lib/db")
  const bcrypt = (await import("bcryptjs")).default

  console.log("→ デモアカウント seed 開始")

  const passwordHash = await bcrypt.hash(COMMON_PASSWORD, 10)

  // ============================================================
  // 1) デモ企業 + CompanyUser
  // ============================================================
  const company = await prisma.company.upsert({
    where: {
      company_source_name_unique: { source: "direct", name: DEMO_COMPANY_NAME },
    },
    create: {
      source: "direct",
      name: DEMO_COMPANY_NAME,
      industry: "建設業（建築・土木）",
      prefecture: "東京都",
      city: "渋谷区",
      address: "東京都渋谷区道玄坂 1-2-3 デモビル 4F",
      employeeCount: "50〜100名",
      description: "建築・土木・設備に強みを持つ デモ用建設会社です。20〜30 代の若手が活躍中。",
      logoUrl: null,
      websiteUrl: "https://example.com",
      contactEmail: COMPANY_EMAIL,
      paymentMethod: "moneyforward",
      status: "approved",
      approvedAt: new Date(),
      // リッチコンテンツ
      tagline: "若手が育つ現場。技術も、家族の笑顔も。",
      pitchHighlights: [
        "■ 入社後 3 ヶ月の OJT 研修で、基本工具・安全衛生・現場マナーをイチから習得",
        "■ 先輩職人 1 人につき 2 人体制で、初日から放置されることはありません",
        "■ 技能講習・資格取得費用は会社が全額負担。受講中の日当も支給",
        "■ 月 1 回の社内勉強会で、業界知識と最新技術を継続キャッチアップ",
      ].join("\n"),
      idealCandidate: [
        "■ 学歴・職歴は問いません。やる気と素直さが何より大事",
        "■ 20 代〜30 代の若手も、40 代以降のベテランも歓迎",
        "■ 体を動かす仕事が好きな方、ものづくりに興味がある方",
        "■ チームで支え合いながら成長していきたい方",
      ].join("\n"),
      employeeVoice: [
        "「未経験で入りましたが、先輩が手取り足取り教えてくれます。1 年で玉掛けと足場の資格を取らせてもらい、給料も入社時より 4 万円上がりました」（20 代男性 / 入社 1 年半）",
      ].join("\n"),
      photos: [
        "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=75",
        "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1200&q=75",
        "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1200&q=75",
      ],
      instagramUrl: "https://www.instagram.com/example_construction",
      tiktokUrl: "https://www.tiktok.com/@example_construction",
      youtubeUrl: "https://www.youtube.com/@example_construction",
      lastContentUpdatedAt: new Date(),
    },
    update: {
      contactEmail: COMPANY_EMAIL,
      status: "approved",
      lastContentUpdatedAt: new Date(),
    },
    select: { id: true, name: true },
  })
  console.log(`  ✓ Company: ${company.name} (${company.id})`)

  // CompanyUser（ログイン可能なアカウント）
  const companyUser = await prisma.companyUser.upsert({
    where: { email: COMPANY_EMAIL },
    create: {
      companyId: company.id,
      email: COMPANY_EMAIL,
      passwordHash,
      name: "デモ 太郎",
      role: "admin",
    },
    update: {
      companyId: company.id,
      passwordHash,
      name: "デモ 太郎",
      role: "admin",
    },
    select: { id: true, email: true },
  })
  console.log(`  ✓ CompanyUser: ${companyUser.email} (${companyUser.id})`)

  // ============================================================
  // 2) デモ求人 3 件（Company 紐付け）
  // ============================================================
  const demoJobs = [
    {
      key: "DEMO-CONST-001",
      title: "【未経験歓迎】鳶工 / 月給 28〜45 万円 / 渋谷",
      category: "construction",
      prefecture: "東京都",
      city: "渋谷区",
      salaryMin: 280000,
      salaryMax: 450000,
      salaryType: "monthly",
      description:
        "首都圏中心の大型ビル建築の鳶工事を担当いただきます。未経験でも先輩がマンツーマンで指導。1 年で玉掛け・足場の資格取得を目指せます。",
      tags: ["未経験OK", "資格取得支援", "寮完備"],
    },
    {
      key: "DEMO-MGMT-001",
      title: "1 級施工管理技士 / 年収 600〜900 万円 / 大手元請",
      category: "management",
      prefecture: "東京都",
      city: "渋谷区",
      salaryMin: 6000000,
      salaryMax: 9000000,
      salaryType: "annual",
      description:
        "大手ゼネコン元請けの 5〜30 億円規模の建築物件で、施工管理を担当いただきます。BIM 導入済み、現代的な現場マネジメントを学べます。",
      tags: ["管理職", "高収入", "BIM"],
    },
    {
      key: "DEMO-DRIVER-001",
      title: "ダンプドライバー / 日給 1.5〜2 万円 / 都内",
      category: "driver",
      prefecture: "東京都",
      city: "渋谷区",
      salaryMin: 15000,
      salaryMax: 20000,
      salaryType: "hourly",
      description:
        "建設現場へのダンプによる残土搬出。大型免許保有者は即戦力として歓迎。直行直帰 OK。",
      tags: ["大型免許", "直行直帰"],
    },
  ]

  for (const j of demoJobs) {
    const existing = await prisma.job.findFirst({
      where: { helloworkId: j.key },
      select: { id: true },
    })
    if (existing) {
      await prisma.job.update({
        where: { id: existing.id },
        data: {
          companyId: company.id,
          title: j.title,
          status: "active",
          publishedAt: new Date(),
        },
      })
      console.log(`  ✓ Job updated: ${j.key}`)
    } else {
      await prisma.job.create({
        data: {
          source: "direct",
          helloworkId: j.key,
          companyId: company.id,
          title: j.title,
          category: j.category,
          employmentType: "full_time",
          description: j.description,
          prefecture: j.prefecture,
          city: j.city,
          salaryMin: j.salaryMin,
          salaryMax: j.salaryMax,
          salaryType: j.salaryType,
          tags: j.tags,
          status: "active",
          publishedAt: new Date(),
        },
      })
      console.log(`  ✓ Job created: ${j.key}`)
    }
  }

  // ============================================================
  // 3) デモ求職者
  // ============================================================
  const seeker = await prisma.user.upsert({
    where: { email: SEEKER_EMAIL },
    create: {
      email: SEEKER_EMAIL,
      passwordHash,
      name: "求職 花子",
      phone: "090-0000-1234",
      prefecture: "東京都",
      city: "渋谷区",
      desiredCategories: ["construction", "management"],
      desiredSalaryMin: 3500000,
      profilePublic: true,
      authProvider: "email",
      emailVerified: new Date(),
    },
    update: {
      passwordHash,
      name: "求職 花子",
      emailVerified: new Date(),
    },
    select: { id: true, email: true },
  })
  console.log(`  ✓ User (seeker): ${seeker.email} (${seeker.id})`)

  // ============================================================
  // 完了
  // ============================================================
  console.log("")
  console.log("🎉 デモアカウント seed 完了")
  console.log("")
  console.log("==========================================================")
  console.log("【企業デモ】")
  console.log(`  URL:      https://www.genbacareer.jp/company/login`)
  console.log(`  email:    ${COMPANY_EMAIL}`)
  console.log(`  password: ${COMMON_PASSWORD}`)
  console.log(`  ロール:   company_admin`)
  console.log(`  会社名:   ${DEMO_COMPANY_NAME}`)
  console.log("")
  console.log("【求職者デモ】")
  console.log(`  URL:      https://www.genbacareer.jp/login`)
  console.log(`  email:    ${SEEKER_EMAIL}`)
  console.log(`  password: ${COMMON_PASSWORD}`)
  console.log(`  ロール:   seeker`)
  console.log("==========================================================")

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error("✖ seed 失敗:", e)
  process.exit(1)
})
