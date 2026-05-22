import { PrismaClient } from "@prisma/client"
import { hashSync } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // ===== 建設会社 =====
  const company1 = await prisma.company.create({
    data: {
      name: "大阪建設工業株式会社",
      industry: "建設",
      prefecture: "大阪府",
      city: "大阪市中央区",
      address: "大阪府大阪市中央区本町3-1-10",
      employeeCount: "101-300",
      description:
        "創業45年、関西を拠点にビル・マンション建設から道路工事まで幅広く手がける総合建設会社です。資格取得支援制度あり。",
      contactEmail: "recruit@osaka-kensetsu.example.com",
    },
  })

  const company2 = await prisma.company.create({
    data: {
      name: "関東土木株式会社",
      industry: "土木",
      prefecture: "東京都",
      city: "港区",
      address: "東京都港区芝公園2-5-8",
      employeeCount: "301-500",
      description:
        "首都圏のインフラ整備を支える土木工事の専門企業。橋梁・トンネル・河川工事の実績多数。",
      contactEmail: "hr@kanto-doboku.example.com",
    },
  })

  const company3 = await prisma.company.create({
    data: {
      name: "九州電設工業株式会社",
      industry: "電気設備",
      prefecture: "福岡県",
      city: "福岡市博多区",
      address: "福岡県福岡市博多区博多駅前4-12-3",
      employeeCount: "51-100",
      description:
        "九州エリアの電気設備工事を中心に、空調・給排水設備まで一貫して施工。再生可能エネルギー事業にも注力。",
      contactEmail: "saiyo@kyushu-densetsu.example.com",
    },
  })

  // ===== 企業担当者 =====
  await prisma.companyUser.create({
    data: {
      companyId: company1.id,
      email: "admin@osaka-kensetsu.example.com",
      passwordHash: hashSync("password123", 10),
      name: "佐藤健一",
      role: "admin",
    },
  })

  await prisma.companyUser.create({
    data: {
      companyId: company2.id,
      email: "admin@kanto-doboku.example.com",
      passwordHash: hashSync("password123", 10),
      name: "鈴木雅彦",
      role: "admin",
    },
  })

  await prisma.companyUser.create({
    data: {
      companyId: company3.id,
      email: "admin@kyushu-densetsu.example.com",
      passwordHash: hashSync("password123", 10),
      name: "中村大輔",
      role: "admin",
    },
  })

  // ===== サンプル求職者 =====
  await prisma.user.create({
    data: {
      email: "tanaka@example.com",
      passwordHash: hashSync("password123", 10),
      name: "田中誠",
      prefecture: "大阪府",
      city: "堺市",
      desiredCategories: ["construction", "civil"],
      desiredSalaryMin: 300000,
      profilePublic: true,
    },
  })

  await prisma.user.create({
    data: {
      email: "yamamoto@example.com",
      passwordHash: hashSync("password123", 10),
      name: "山本拓也",
      prefecture: "東京都",
      city: "足立区",
      desiredCategories: ["electrical", "management"],
      desiredSalaryMin: 350000,
      profilePublic: true,
    },
  })

  // ===== 直接掲載求人 =====
  const directJobs = [
    {
      title: "鳶職人【月給35万～】",
      category: "construction",
      subcategory: "scaffolding",
      prefecture: "大阪府",
      city: "大阪市中央区",
      salaryMin: 350000,
      salaryMax: 500000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company1.id,
      description:
        "ビル・マンション建設現場での足場組立・解体作業。高所作業に抵抗のない方歓迎。経験に応じて即戦力採用あり。チームワークを大切にできる方をお待ちしています。",
      benefits: ["社会保険完備", "資格手当", "退職金制度", "寮完備", "交通費全額支給"],
      tags: ["経験者優遇", "日払い可", "寮付き"],
    },
    {
      title: "型枠大工 経験者優遇",
      category: "construction",
      subcategory: "formwork",
      prefecture: "東京都",
      city: "江東区",
      salaryMin: 380000,
      salaryMax: 550000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company2.id,
      description:
        "RC造建築物の型枠組立・解体作業。経験3年以上の方は優遇します。大手ゼネコン現場中心で安定した仕事量を確保。",
      benefits: ["社会保険完備", "資格手当", "退職金制度", "工具支給"],
      tags: ["経験者優遇", "資格保有者優遇", "高収入"],
    },
    {
      title: "土木作業員【未経験歓迎】",
      category: "civil",
      subcategory: "general",
      prefecture: "福岡県",
      city: "福岡市博多区",
      salaryMin: 250000,
      salaryMax: 350000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company3.id,
      description:
        "道路・下水道工事の現場作業全般。未経験でも丁寧に指導します。体を動かすことが好きな方、手に職をつけたい方にピッタリ。",
      benefits: ["社会保険完備", "交通費支給", "資格取得支援", "制服貸与"],
      tags: ["未経験歓迎", "学歴不問", "資格取得支援"],
    },
    {
      title: "電気工事士 1種・2種",
      category: "electrical",
      subcategory: "wiring",
      prefecture: "愛知県",
      city: "名古屋市中区",
      salaryMin: 300000,
      salaryMax: 450000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company3.id,
      description:
        "オフィスビル・商業施設の電気配線工事、受変電設備の据付・保守。第二種電気工事士以上の資格をお持ちの方。",
      benefits: ["社会保険完備", "資格手当", "退職金制度", "家族手当", "交通費全額支給"],
      tags: ["資格保有者優遇", "経験者優遇", "転勤なし"],
    },
    {
      title: "内装クロス工【日給12,000円～】",
      category: "interior",
      subcategory: "wallpaper",
      prefecture: "大阪府",
      city: "堺市",
      salaryMin: 12000,
      salaryMax: 18000,
      salaryType: "daily",
      employmentType: "full_time",
      companyId: company1.id,
      description:
        "新築・リフォーム現場でのクロス貼り作業。丁寧な仕事ができる方を募集。道具一式は貸与します。",
      benefits: ["社会保険完備", "交通費支給", "道具貸与", "車通勤可"],
      tags: ["日払い可", "経験者優遇", "直行直帰OK"],
    },
    {
      title: "解体工事作業員",
      category: "demolition",
      subcategory: "general",
      prefecture: "東京都",
      city: "足立区",
      salaryMin: 300000,
      salaryMax: 420000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company2.id,
      description:
        "木造・RC造建物の解体作業。安全第一をモットーに、チームで協力して作業を進めます。体力に自信のある方歓迎。",
      benefits: ["社会保険完備", "日払い対応可", "寮完備", "交通費支給"],
      tags: ["未経験歓迎", "日払い可", "寮付き", "学歴不問"],
    },
    {
      title: "施工管理技士（土木）",
      category: "management",
      subcategory: "civil",
      prefecture: "大阪府",
      city: "大阪市北区",
      salaryMin: 450000,
      salaryMax: 700000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company1.id,
      description:
        "土木工事の施工管理業務全般。工程管理・品質管理・安全管理・原価管理をお任せします。1級土木施工管理技士の資格をお持ちの方は優遇。",
      benefits: ["社会保険完備", "退職金制度", "資格手当", "家族手当", "社用車貸与", "賞与年2回"],
      tags: ["資格保有者優遇", "高収入", "土日休み"],
    },
    {
      title: "重機オペレーター",
      category: "driver",
      subcategory: "heavy_equipment",
      prefecture: "北海道",
      city: "札幌市白石区",
      salaryMin: 280000,
      salaryMax: 400000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company2.id,
      description:
        "バックホウ・ブルドーザー等の重機を操作し、造成工事や道路工事に従事。車両系建設機械の資格をお持ちの方。",
      benefits: ["社会保険完備", "寮完備", "資格手当", "冬季手当", "交通費支給"],
      tags: ["資格保有者優遇", "寮付き", "転勤なし"],
    },
    {
      title: "測量士補【年間休日120日】",
      category: "survey",
      subcategory: "general",
      prefecture: "東京都",
      city: "新宿区",
      salaryMin: 280000,
      salaryMax: 380000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company2.id,
      description:
        "土木・建築現場での測量業務。トータルステーション・GPS測量機器を使用した各種測量。測量士補以上の資格をお持ちの方。",
      benefits: ["社会保険完備", "退職金制度", "資格手当", "交通費全額支給", "完全週休2日制"],
      tags: ["資格保有者優遇", "土日休み", "年間休日120日以上"],
    },
    {
      title: "防水工【経験不問】",
      category: "construction",
      subcategory: "waterproofing",
      prefecture: "神奈川県",
      city: "横浜市西区",
      salaryMin: 280000,
      salaryMax: 400000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company1.id,
      description:
        "屋上・ベランダ等の防水工事。シート防水・ウレタン防水など各種工法を習得できます。未経験から一人前の職人を目指せる環境です。",
      benefits: ["社会保険完備", "資格取得支援", "交通費支給", "制服貸与"],
      tags: ["未経験歓迎", "資格取得支援", "学歴不問"],
    },
    {
      title: "鉄筋工 日給14,000円～",
      category: "construction",
      subcategory: "rebar",
      prefecture: "埼玉県",
      city: "さいたま市大宮区",
      salaryMin: 14000,
      salaryMax: 20000,
      salaryType: "daily",
      employmentType: "full_time",
      companyId: company2.id,
      description:
        "RC造建築物の鉄筋組立作業。図面を読んで正確に鉄筋を配置できる方。経験者は日給優遇。",
      benefits: ["社会保険完備", "資格手当", "日払い対応可", "交通費支給"],
      tags: ["経験者優遇", "日払い可", "高収入"],
    },
    {
      title: "空調設備工事スタッフ",
      category: "electrical",
      subcategory: "hvac",
      prefecture: "大阪府",
      city: "大阪市淀川区",
      salaryMin: 280000,
      salaryMax: 420000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company3.id,
      description:
        "商業施設・オフィスビルのエアコン設置・配管工事。冷媒配管の施工経験がある方優遇。管工事施工管理技士の資格取得を支援します。",
      benefits: ["社会保険完備", "資格取得支援", "退職金制度", "交通費支給", "車通勤可"],
      tags: ["経験者優遇", "資格取得支援", "転勤なし"],
    },
    {
      title: "現場監督（建築）【年収500万～】",
      category: "management",
      subcategory: "building",
      prefecture: "東京都",
      city: "中央区",
      salaryMin: 420000,
      salaryMax: 650000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company2.id,
      description:
        "マンション・商業施設の新築工事における現場監督業務。工程・品質・安全・原価の4大管理をお任せします。1級建築施工管理技士歓迎。",
      benefits: ["社会保険完備", "退職金制度", "資格手当", "賞与年2回", "社用車貸与", "家族手当"],
      tags: ["資格保有者優遇", "高収入", "土日休み", "賞与あり"],
    },
    {
      title: "ダンプ運転手【4t・10t】",
      category: "driver",
      subcategory: "dump_truck",
      prefecture: "千葉県",
      city: "船橋市",
      salaryMin: 300000,
      salaryMax: 420000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company1.id,
      description:
        "建設現場への資材搬入、残土搬出のダンプカー運転業務。中型免許以上をお持ちの方。大型免許保有者優遇。",
      benefits: ["社会保険完備", "交通費支給", "車通勤可", "免許取得支援"],
      tags: ["資格保有者優遇", "経験者優遇", "転勤なし"],
    },
    {
      title: "左官工【住宅・店舗】",
      category: "interior",
      subcategory: "plastering",
      prefecture: "京都府",
      city: "京都市下京区",
      salaryMin: 300000,
      salaryMax: 450000,
      salaryType: "monthly",
      employmentType: "full_time",
      companyId: company1.id,
      description:
        "住宅・店舗の内外壁の左官仕上げ工事。塗り壁・モルタル仕上げの技術を持つ方募集。伝統技法を活かせる現場もあり。",
      benefits: ["社会保険完備", "退職金制度", "道具支給", "交通費支給"],
      tags: ["経験者優遇", "直行直帰OK"],
    },
  ]

  for (const job of directJobs) {
    await prisma.job.create({
      data: {
        ...job,
        source: "direct",
        status: "active",
        publishedAt: new Date(),
      },
    })
  }

  // ===== ハローワーク転載求人 =====
  const helloworkJobs = [
    {
      helloworkId: "27010-00000001",
      title: "建築塗装工（ハローワーク転載）",
      category: "construction",
      subcategory: "painting",
      prefecture: "大阪府",
      city: "東大阪市",
      salaryMin: 250000,
      salaryMax: 350000,
    },
    {
      helloworkId: "13010-00000002",
      title: "下水道工事作業員（ハローワーク転載）",
      category: "civil",
      subcategory: "sewage",
      prefecture: "東京都",
      city: "板橋区",
      salaryMin: 260000,
      salaryMax: 340000,
    },
    {
      helloworkId: "40010-00000003",
      title: "電気設備保守点検員（ハローワーク転載）",
      category: "electrical",
      subcategory: "maintenance",
      prefecture: "福岡県",
      city: "北九州市小倉北区",
      salaryMin: 230000,
      salaryMax: 310000,
    },
    {
      helloworkId: "01010-00000004",
      title: "除雪作業員・重機オペレーター（ハローワーク転載）",
      category: "driver",
      subcategory: "heavy_equipment",
      prefecture: "北海道",
      city: "旭川市",
      salaryMin: 240000,
      salaryMax: 330000,
    },
    {
      helloworkId: "23010-00000005",
      title: "解体工事作業員（ハローワーク転載）",
      category: "demolition",
      subcategory: "general",
      prefecture: "愛知県",
      city: "名古屋市中川区",
      salaryMin: 250000,
      salaryMax: 350000,
    },
  ]

  for (const job of helloworkJobs) {
    await prisma.job.create({
      data: {
        source: "hellowork",
        helloworkId: job.helloworkId,
        title: job.title,
        category: job.category,
        subcategory: job.subcategory,
        employmentType: "full_time",
        description: "ハローワークインターネットサービスより転載。詳細はハローワーク窓口にてご確認ください。",
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        salaryType: "monthly",
        prefecture: job.prefecture,
        city: job.city,
        benefits: ["社会保険完備"],
        tags: [],
        status: "active",
        publishedAt: new Date(),
      },
    })
  }

  console.log(
    "Seed completed: 3 companies, 3 company users, 2 seekers, 20 jobs (15 direct + 5 hellowork)"
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
