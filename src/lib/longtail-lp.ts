/**
 * ロングテール LP (年収 / 資格 / 雇用形態) の定義データ。
 *
 * 静的ルートで Prisma に流すクエリパラメータを各 LP に紐づける。
 * 7-12 ヶ月の運用で大きな自然流入を期待できる「狭く深い検索」キーワード群。
 */

import type { CategoryValue } from "./categories"

// ============================================================
// 年収レンジ LP — /salary/[range]
// ============================================================

export type SalaryRange = {
  slug: string
  label: string
  minMonthly: number
  // SEO 用 description / heading 補助テキスト
  heading: string
  description: string
}

export const SALARY_RANGES: SalaryRange[] = [
  {
    slug: "200man",
    label: "月給 20 万円以上",
    minMonthly: 200000,
    heading: "月給 20 万円以上の建設業求人",
    description:
      "未経験から始められる月給 20 万円以上の建設業求人を全国から検索。残業時間・福利厚生・寮社宅完備の条件で絞り込み可能。",
  },
  {
    slug: "250man",
    label: "月給 25 万円以上",
    minMonthly: 250000,
    heading: "月給 25 万円以上の建設業求人",
    description:
      "建設業界で月給 25 万円以上の求人を厳選。経験 1〜3 年・若手活躍中の案件多数。資格取得支援ありの会社も検索可能。",
  },
  {
    slug: "300man",
    label: "月給 30 万円以上",
    minMonthly: 300000,
    heading: "月給 30 万円以上の建設業求人",
    description:
      "現場経験者向け、月給 30 万円以上の建設業求人特集。施工管理・電気工事・配管・大工など職種別に検索可能。",
  },
  {
    slug: "350man",
    label: "月給 35 万円以上",
    minMonthly: 350000,
    heading: "月給 35 万円以上の建設業求人",
    description:
      "中堅クラスの建設業求人 (月給 35 万円以上)。職長手当・現場代理人手当・住宅手当が充実した会社を厳選。",
  },
  {
    slug: "400man",
    label: "月給 40 万円以上",
    minMonthly: 400000,
    heading: "月給 40 万円以上の建設業求人",
    description:
      "現場リーダー / 監督候補向け、月給 40 万円以上の建設業求人。1 級施工管理技士・建築士保有者優遇案件多数。",
  },
  {
    slug: "500man",
    label: "月給 50 万円以上",
    minMonthly: 500000,
    heading: "月給 50 万円以上の建設業求人",
    description:
      "管理職クラスの建設業求人 (月給 50 万円以上)。所長・現場代理人クラス、ゼネコン経験者歓迎。年収換算 700 万円〜の高収入求人。",
  },
]

export function getSalaryRangeBySlug(slug: string): SalaryRange | null {
  return SALARY_RANGES.find((r) => r.slug === slug) ?? null
}

// ============================================================
// 資格別 LP — /license/[license]
// ============================================================

export type LicenseLp = {
  slug: string
  label: string
  /** 求人タイトル / requirements / tags にマッチさせる検索ワード */
  searchTerms: string[]
  /** 主に対応するカテゴリ (LP heading 補強用) */
  primaryCategory?: CategoryValue
  heading: string
  description: string
  /** 簡単な資格説明 */
  about: string
}

export const LICENSE_LPS: LicenseLp[] = [
  {
    slug: "ikkyu-sekou-kanri",
    label: "1 級施工管理技士",
    searchTerms: ["1級施工管理技士", "一級施工管理技士", "1級建築施工管理技士"],
    primaryCategory: "management",
    heading: "1 級施工管理技士の建設業求人",
    description:
      "1 級施工管理技士の資格を活かせる現場代理人・所長クラスの建設業求人を全国から検索。資格手当 / 退職金制度ありの会社多数。",
    about:
      "1 級施工管理技士は、大規模建設工事の現場代理人・主任技術者・監理技術者になれる国家資格。建築・土木・電気・管・造園など分野ごとに区分があり、ゼネコン・サブコンで強く求められる。",
  },
  {
    slug: "nikyu-sekou-kanri",
    label: "2 級施工管理技士",
    searchTerms: ["2級施工管理技士", "二級施工管理技士", "2級建築施工管理技士"],
    primaryCategory: "management",
    heading: "2 級施工管理技士の建設業求人",
    description:
      "2 級施工管理技士の有資格者向け 建設業求人。中小ゼネコン・地域工務店で主任技術者として活躍できるポジション多数。",
    about:
      "2 級施工管理技士は、中規模工事の主任技術者になれる国家資格。1 級と比べて取得難易度が低く、若手キャリアアップの登竜門。建築・土木・電気・管・造園で区分がある。",
  },
  {
    slug: "ikkyu-kenchikushi",
    label: "1 級建築士",
    searchTerms: ["1級建築士", "一級建築士"],
    primaryCategory: "survey",
    heading: "1 級建築士の建設業求人",
    description:
      "1 級建築士の資格を活かせる設計事務所・ゼネコン・ハウスメーカーの求人。意匠 / 構造 / 設備の設計、現場監理ポジションを掲載。",
    about:
      "1 級建築士は、建築物の規模・構造・用途に制限なく設計・工事監理ができる国家資格。設計事務所・ゼネコン・行政・教育機関など活躍範囲が広い。",
  },
  {
    slug: "denki-kouji-2",
    label: "第二種電気工事士",
    searchTerms: ["第二種電気工事士", "電気工事士", "電工二種"],
    primaryCategory: "electrical",
    heading: "第二種電気工事士の建設業求人",
    description:
      "第二種電気工事士の資格を活かせる電気工事会社・設備工事会社の求人。住宅・小規模商業施設の電気工事ポジション多数。",
    about:
      "第二種電気工事士は、600V 以下の電気工作物を扱える国家資格。住宅・店舗・小規模ビルの屋内配線工事に従事できる、電気工事の入口資格。",
  },
  {
    slug: "tamakake",
    label: "玉掛け技能講習",
    searchTerms: ["玉掛け", "玉掛"],
    primaryCategory: "construction",
    heading: "玉掛け技能講習修了者の建設業求人",
    description:
      "玉掛け技能講習修了者を歓迎する建設業求人。鉄筋・型枠・鳶・とび職など、現場で資格を活かせるポジションを集約。",
    about:
      "玉掛け技能講習は、クレーンで吊り荷を扱う作業 (玉掛け作業) に必要な技能講習。建設現場で必須レベルの資格で、所要日数 3 日程度で取得できる。",
  },
  {
    slug: "fork-lift",
    label: "フォークリフト運転技能講習",
    searchTerms: ["フォークリフト"],
    primaryCategory: "driver",
    heading: "フォークリフト運転技能講習修了者の建設業求人",
    description:
      "フォークリフト運転技能講習修了者向けの建設・物流求人。倉庫・建設資材ヤード・建材店の運搬ポジション多数。",
    about:
      "フォークリフト運転技能講習は、最大荷重 1 トン以上のフォークリフトを運転できる技能講習。建設業・物流業で需要が高い汎用資格。",
  },
  {
    slug: "doboku-sekou-1",
    label: "1 級土木施工管理技士",
    searchTerms: ["1級土木施工管理技士", "一級土木施工管理技士"],
    primaryCategory: "civil",
    heading: "1 級土木施工管理技士の建設業求人",
    description:
      "1 級土木施工管理技士の資格を活かせる土木工事・公共工事の現場代理人 / 監理技術者ポジション。ゼネコン・地域建設会社で多数掲載。",
    about:
      "1 級土木施工管理技士は、土木工事 (道路・橋梁・河川・トンネル等) の現場代理人・監理技術者になれる国家資格。公共工事の入札に必須。",
  },
  {
    slug: "haikan-koji",
    label: "配管技能士",
    searchTerms: ["配管技能士", "配管工"],
    primaryCategory: "electrical",
    heading: "配管技能士・配管工の建設業求人",
    description:
      "配管技能士の資格を持つ配管工・設備工事の求人。給排水衛生設備・空調設備・ガス工事のポジションを集約。",
    about:
      "配管技能士は、配管工事 (給排水・空調・ガス) の技能を評価する国家技能検定。1 級・2 級・3 級があり、設備工事会社で評価が高い。",
  },
  {
    slug: "full-harness",
    label: "フルハーネス特別教育",
    searchTerms: ["フルハーネス", "墜落制止用器具"],
    primaryCategory: "construction",
    heading: "フルハーネス特別教育修了者の建設業求人",
    description:
      "フルハーネス特別教育修了者向けの建設業求人。高所作業 (鳶・とび職・足場組立) を伴うポジションでは必須レベルの資格。",
    about:
      "フルハーネス型墜落制止用器具特別教育は、高さ 2 m 以上での作業でフルハーネス安全帯を使用するために必要な特別教育。2019 年から段階的に義務化。",
  },
]

export function getLicenseLpBySlug(slug: string): LicenseLp | null {
  return LICENSE_LPS.find((l) => l.slug === slug) ?? null
}

// ============================================================
// 雇用形態 LP — /employment-type/[type]
// ============================================================

export type EmploymentLp = {
  slug: string
  label: string
  /** Job.employmentType の値と一致させる */
  employmentTypeValue: string
  heading: string
  description: string
  about: string
}

export const EMPLOYMENT_LPS: EmploymentLp[] = [
  {
    slug: "full-time",
    label: "正社員",
    employmentTypeValue: "full_time",
    heading: "正社員の建設業求人",
    description:
      "建設業界の正社員求人を全国から検索。社会保険・賞与・退職金完備の安定したキャリアを目指せるポジションを掲載。",
    about:
      "正社員は、企業と無期雇用契約を結び、社会保険・賞与・退職金などの福利厚生を受けられる雇用形態。建設業界ではキャリアパスが明確で、現場リーダー / 監督 / 役職者へとステップアップしやすい。",
  },
  {
    slug: "contract",
    label: "契約社員",
    employmentTypeValue: "contract",
    heading: "契約社員の建設業求人",
    description:
      "建設業界の契約社員求人。プロジェクト単位での参画やトライアル採用、専門スキルを活かしたい方向けのポジションを集約。",
    about:
      "契約社員は、期間を定めた雇用契約 (例: 1 年) を結び、特定の業務やプロジェクトに従事する雇用形態。専門性の高い職種で正社員登用制度を併設する会社も多い。",
  },
  {
    slug: "part-time",
    label: "パート・アルバイト",
    employmentTypeValue: "part_time",
    heading: "パート・アルバイトの建設業求人",
    description:
      "建設業界のパート・アルバイト求人。短時間勤務・週 1 日から OK の現場補助・解体・運搬ポジションを掲載。",
    about:
      "パート・アルバイトは、短時間勤務・曜日固定・週 1〜3 日勤務などフレキシブルに働ける雇用形態。建設業界では現場補助・解体・運搬・清掃などで募集が多い。",
  },
]

export function getEmploymentLpBySlug(slug: string): EmploymentLp | null {
  return EMPLOYMENT_LPS.find((e) => e.slug === slug) ?? null
}
