/**
 * 求人投稿ウィザードで選択できる業界別ひな型。
 *
 * カテゴリ × 代表職種ごとに「題名 / 仕事内容 / 応募要件 / 福利厚生 / タグ」を
 * プリセット。テンプレを適用すると JobWizard の対応フィールドが上書きされる。
 *
 * 「使い回せる雛形があるだけで投稿のハードルが大幅に下がる」
 * という UX 改善が狙いなので、文言はあえてカスタマイズ前提の汎用文。
 */

import type { ConstructionCategoryValue } from "@/lib/categories"

export interface JobTemplate {
  id: string
  name: string
  category: ConstructionCategoryValue
  description: string
  requirements: string
  benefits: string[]
  tags: string[]
  // 推定の月給レンジ（万円）
  salaryMin?: number
  salaryMax?: number
  // フィードバック用の補足
  hint?: string
}

const COMMON_BENEFITS = [
  "社会保険完備",
  "交通費支給",
  "賞与あり",
  "退職金制度",
  "資格取得支援",
]

const COMMON_TAGS = ["未経験歓迎", "土日休み", "資格取得支援"]

export const JOB_TEMPLATES: JobTemplate[] = [
  // ===== 建築・躯体 =====
  {
    id: "construction-tobi",
    name: "鳶工（足場組立）",
    category: "construction",
    description: [
      "建設現場での足場の組立・解体作業をお任せします。",
      "",
      "【具体的な仕事内容】",
      "・各種建設現場での足場の組立・解体・点検",
      "・資材の運搬・整理",
      "・先輩社員のサポート（未経験スタート歓迎）",
      "",
      "【1 日の流れ】",
      "7:00 集合・移動 / 8:00 現場入り / 12:00 昼休憩 / 17:00 撤収",
    ].join("\n"),
    requirements: [
      "・体力に自信のある方歓迎",
      "・普通自動車免許（AT 限定可）あれば尚可",
      "・職人気質を大事にしてくれる方",
      "・玉掛け・足場の組立て等作業主任者などの資格保持者は優遇",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "作業着貸与", "現場手当"],
    tags: [...COMMON_TAGS, "鳶職", "日給制可"],
    salaryMin: 250_000,
    salaryMax: 450_000,
    hint: "高所作業・足場系。日給制（日給 13,000 〜 25,000 円）も人気",
  },
  {
    id: "construction-form",
    name: "型枠大工",
    category: "construction",
    description: [
      "建物の基礎・柱・壁・床のコンクリート型枠を作る仕事です。",
      "",
      "【具体的な仕事内容】",
      "・図面に基づく型枠の加工・組立",
      "・コンクリート打設後の解体",
      "・道具・資材の運搬・片付け",
      "",
      "技術が身に付くと給与もしっかり上がる、長く続けられる職人仕事です。",
    ].join("\n"),
    requirements: [
      "・未経験歓迎、長く続けられる方",
      "・普通自動車免許（AT 限定可）",
      "・体力に自信のある方",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "工具貸与", "資格取得費用全額支給"],
    tags: [...COMMON_TAGS, "型枠大工", "若手活躍中"],
    salaryMin: 230_000,
    salaryMax: 420_000,
  },

  // ===== 土木 =====
  {
    id: "civil-worker",
    name: "土木作業員",
    category: "civil",
    description: [
      "道路・橋梁・河川・上下水道などの土木工事をお任せします。",
      "",
      "【具体的な仕事内容】",
      "・掘削・埋戻し作業のサポート",
      "・コンクリート打設の補助",
      "・建設機械の合図・誘導",
      "",
      "公共工事中心で安定受注。残業少なめで腰を据えて働けます。",
    ].join("\n"),
    requirements: [
      "・未経験歓迎",
      "・普通自動車免許（AT 限定可）",
      "・健康で体力に自信のある方",
      "・車両系建設機械、玉掛け、移動式クレーン等の資格は優遇",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "皆勤手当", "現場手当"],
    tags: [...COMMON_TAGS, "公共工事多数", "残業少なめ"],
    salaryMin: 220_000,
    salaryMax: 400_000,
  },

  // ===== 電気・設備 =====
  {
    id: "electrical-worker",
    name: "電気工事士",
    category: "electrical",
    description: [
      "ビル・マンション・商業施設・住宅などの電気設備工事を担当します。",
      "",
      "【具体的な仕事内容】",
      "・配線・配管作業",
      "・スイッチ / コンセント / 照明器具の取り付け",
      "・キュービクル等の動力設備工事（経験者）",
      "",
      "資格取得を全面バックアップ。1 種・2 種電気工事士、認定電気工事従事者の取得を支援します。",
    ].join("\n"),
    requirements: [
      "・未経験歓迎、第 2 種電気工事士取得を目指す意欲のある方",
      "・第 2 種電気工事士 / 第 1 種電気工事士の有資格者優遇",
      "・普通自動車免許（AT 限定可）",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "資格手当（最大 月 3 万円）", "工具支給"],
    tags: [...COMMON_TAGS, "電気工事", "資格手当あり"],
    salaryMin: 250_000,
    salaryMax: 500_000,
  },

  // ===== 内装・仕上げ =====
  {
    id: "interior-finishing",
    name: "内装仕上げ工",
    category: "interior",
    description: [
      "オフィス・店舗・住宅の内装仕上げ作業（クロス貼り・床貼り・パーテーション施工等）をお任せします。",
      "",
      "【具体的な仕事内容】",
      "・壁紙・クロスの貼り替え",
      "・床材（CF・タイル・フローリング）の施工",
      "・軽天・パーテーション組立",
      "",
      "細かい作業が好きな方、几帳面な方に向いています。",
    ].join("\n"),
    requirements: [
      "・未経験歓迎",
      "・きれいに仕上げることにこだわれる方",
      "・普通自動車免許（AT 限定可）",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "完工手当", "技能講習費用補助"],
    tags: [...COMMON_TAGS, "内装", "細かい作業"],
    salaryMin: 220_000,
    salaryMax: 380_000,
  },

  // ===== 解体・産廃 =====
  {
    id: "demolition-worker",
    name: "解体工",
    category: "demolition",
    description: [
      "住宅・ビル・店舗などの解体工事を担当します。",
      "",
      "【具体的な仕事内容】",
      "・建物の手壊し・機械解体",
      "・分別・産廃積込",
      "・養生 / 足場 / アスベスト対応（資格者）",
      "",
      "石綿作業主任者・解体施工技士などの資格取得を会社が全額支援します。",
    ].join("\n"),
    requirements: [
      "・未経験歓迎、体を動かす仕事が好きな方",
      "・普通自動車免許（AT 限定可）必須",
      "・中型免許保持者優遇",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "資格取得補助", "現場手当"],
    tags: [...COMMON_TAGS, "解体", "高収入可"],
    salaryMin: 240_000,
    salaryMax: 450_000,
  },

  // ===== ドライバー・重機 =====
  {
    id: "driver-large",
    name: "大型トラックドライバー（長距離）",
    category: "driver",
    description: [
      "建材・資材を全国の現場へお届けする大型トラックドライバーです。",
      "",
      "【具体的な仕事内容】",
      "・建材 / 資材 / 機械の積込・運搬・荷下ろし",
      "・運行管理システム入力",
      "・荷主との簡単な調整",
      "",
      "週休 1 〜 2 日、月収 45 万円以上も可能。経験者は即戦力として優遇します。",
    ].join("\n"),
    requirements: [
      "・大型自動車免許必須",
      "・大型ドライバー経験 1 年以上歓迎",
      "・牽引・大型特殊免許保持者は優遇",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "車両保険完備", "歩合給あり", "個室寮あり"],
    tags: ["大型ドライバー", "高収入", "歩合あり"],
    salaryMin: 350_000,
    salaryMax: 600_000,
  },
  {
    id: "driver-heavy-machine",
    name: "重機オペレーター",
    category: "driver",
    description: [
      "ユンボ・ホイールローダー・ダンプなどの建設機械を操作する仕事です。",
      "",
      "【具体的な仕事内容】",
      "・土木・解体現場での重機操作",
      "・機械の日常点検・洗浄",
      "・補助作業員との連携",
    ].join("\n"),
    requirements: [
      "・車両系建設機械運転技能講習修了者",
      "・大型特殊免許 / 大型自動車免許保持者優遇",
      "・経験 2 年以上歓迎",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "資格手当", "機械貸与"],
    tags: ["重機オペレーター", "経験者歓迎", "高収入"],
    salaryMin: 280_000,
    salaryMax: 500_000,
  },

  // ===== 施工管理 =====
  {
    id: "management-junior",
    name: "施工管理（未経験〜中堅）",
    category: "management",
    description: [
      "建築 / 土木の現場で、工程・安全・品質・原価を管理する仕事です。",
      "",
      "【具体的な仕事内容】",
      "・現場の工程管理・安全管理",
      "・職人さんとの調整・打ち合わせ",
      "・写真撮影 / 書類作成 / 検査立ち会い",
      "",
      "1 級建築施工管理技士 / 1 級土木施工管理技士の取得を全額会社負担で支援。",
    ].join("\n"),
    requirements: [
      "・高卒以上、健康で意欲のある方",
      "・普通自動車免許（AT 限定可）",
      "・2 級 / 1 級施工管理技士保持者は優遇",
    ].join("\n"),
    benefits: [
      ...COMMON_BENEFITS,
      "資格手当（1 級: 月 5 万円）",
      "iPad 貸与",
      "退職金制度",
    ],
    tags: [...COMMON_TAGS, "施工管理", "資格手当あり", "ホワイト"],
    salaryMin: 280_000,
    salaryMax: 600_000,
  },

  // ===== 測量・設計 =====
  {
    id: "survey-staff",
    name: "測量スタッフ",
    category: "survey",
    description: [
      "土木 / 建築の現場で、測量機器を使って正確な計測を行う仕事です。",
      "",
      "【具体的な仕事内容】",
      "・基準点測量 / 路線測量 / 用地測量",
      "・トータルステーション / GPS 測量機の操作",
      "・図面・成果報告書作成",
      "",
      "測量士補・測量士・補助者の資格取得を会社が支援します。",
    ].join("\n"),
    requirements: [
      "・未経験歓迎、CAD やパソコンに抵抗のない方",
      "・普通自動車免許（AT 限定可）",
      "・測量士補保持者は優遇",
    ].join("\n"),
    benefits: [...COMMON_BENEFITS, "資格取得支援", "CAD 研修あり"],
    tags: [...COMMON_TAGS, "測量", "CAD 経験不問"],
    salaryMin: 240_000,
    salaryMax: 450_000,
  },
]

export function getTemplatesByCategory(
  category: ConstructionCategoryValue | "all"
): JobTemplate[] {
  if (category === "all") return JOB_TEMPLATES
  return JOB_TEMPLATES.filter((t) => t.category === category)
}

export function findTemplate(id: string): JobTemplate | undefined {
  return JOB_TEMPLATES.find((t) => t.id === id)
}

// ============================================================================
// DB-backed loader
// ============================================================================
// 管理者がテンプレを追加/編集できるよう DB 化した（schema: JobTemplate）。
// 既存ファイル内の静的データは「初期 seed」「DB エラー時のフォールバック」として残す。

import { prisma } from "@/lib/db"

/**
 * 管理者画面で編集された DB のテンプレを返す。
 * - DB が空 → 静的データ（seed 前提）
 * - DB エラー → 静的データ
 * - DB に行があれば isActive のみを sortOrder 順で返す
 */
export async function loadActiveJobTemplates(): Promise<JobTemplate[]> {
  try {
    const rows = await prisma.jobTemplate.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { category: "asc" }, { name: "asc" }],
    })
    if (rows.length === 0) return JOB_TEMPLATES
    return rows.map((r) => ({
      id: r.slug,
      name: r.name,
      category: r.category as ConstructionCategoryValue,
      description: r.description,
      requirements: r.requirements ?? "",
      benefits: r.benefits,
      tags: r.tags,
      salaryMin: r.salaryMin ?? undefined,
      salaryMax: r.salaryMax ?? undefined,
      hint: r.hint ?? undefined,
    }))
  } catch {
    return JOB_TEMPLATES
  }
}
