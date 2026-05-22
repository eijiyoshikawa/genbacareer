/**
 * 求職者登録ウィザードで使う、建設業特化の職種マスタ。
 *
 * Top の 9 カテゴリ (建築・躯体 / 土木 / 電気・設備 / 内装 / 解体 / ドライバー /
 * 施工管理 / 測量・設計 / その他) は @/lib/categories と一致。
 * その配下に「現場でよく使われる具体的な職種名」を細分化して並べる。
 *
 * マイナビ転職と異なり、ゲンバキャリアは建設業特化なので Top カテゴリは
 * 折り畳みではなく前面に並べ、配下の細分のみアコーディオン展開する。
 */

import type { CategoryValue } from "@/lib/categories"

export type JobSubcategory = {
  value: string
  label: string
}

export type ConstructionJobGroup = {
  /** 9 カテゴリ (建設業 8 + "other") */
  category: CategoryValue
  label: string
  /** 1 文タグライン (UI 補助) */
  tagline: string
  subcategories: JobSubcategory[]
}

export const CONSTRUCTION_JOB_GROUPS: ConstructionJobGroup[] = [
  {
    category: "construction",
    label: "建築・躯体",
    tagline: "鳶 / 型枠 / 鉄筋 / 大工 / 塗装 etc",
    subcategories: [
      { value: "tobi", label: "鳶・とび職" },
      { value: "katawaku", label: "型枠大工" },
      { value: "tekkin", label: "鉄筋工" },
      { value: "daiku", label: "大工" },
      { value: "concrete", label: "コンクリート工" },
      { value: "rebar", label: "鉄骨組立" },
      { value: "scaffolding", label: "足場組立" },
      { value: "construction-other", label: "その他建築・躯体工事" },
    ],
  },
  {
    category: "civil",
    label: "土木",
    tagline: "土工 / 重機オペ / 舗装 / 橋梁 / トンネル",
    subcategories: [
      { value: "doko", label: "土工" },
      { value: "heavy-machine", label: "重機オペレーター" },
      { value: "pavement", label: "舗装工" },
      { value: "bridge", label: "橋梁工事" },
      { value: "tunnel", label: "トンネル工事" },
      { value: "river", label: "河川工事" },
      { value: "civil-other", label: "その他土木工事" },
    ],
  },
  {
    category: "electrical",
    label: "電気・設備",
    tagline: "電工 / 配管 / 空調 / 通信",
    subcategories: [
      { value: "electrician", label: "電気工事士" },
      { value: "plumber", label: "配管工" },
      { value: "hvac", label: "空調設備工事" },
      { value: "telecom", label: "通信工事" },
      { value: "fire-protection", label: "消防設備工事" },
      { value: "instrumentation", label: "計装工事" },
      { value: "electrical-other", label: "その他電気・設備工事" },
    ],
  },
  {
    category: "interior",
    label: "内装・仕上げ",
    tagline: "クロス / 塗装 / 左官 / タイル / 床貼り",
    subcategories: [
      { value: "cross", label: "クロス工" },
      { value: "painter", label: "塗装工" },
      { value: "plaster", label: "左官工" },
      { value: "tile", label: "タイル工" },
      { value: "flooring", label: "床貼り工" },
      { value: "ceiling", label: "天井工事" },
      { value: "interior-other", label: "その他内装・仕上げ" },
    ],
  },
  {
    category: "demolition",
    label: "解体・産廃",
    tagline: "解体 / アスベスト除去 / 産廃ドライバー",
    subcategories: [
      { value: "demolition-worker", label: "解体工" },
      { value: "asbestos", label: "アスベスト除去" },
      { value: "waste-driver", label: "産廃ドライバー" },
      { value: "scaffolding-removal", label: "足場解体" },
      { value: "demolition-other", label: "その他解体・産廃" },
    ],
  },
  {
    category: "driver",
    label: "ドライバー・重機",
    tagline: "ダンプ / トレーラー / ミキサー / ユニック",
    subcategories: [
      { value: "dump", label: "ダンプドライバー" },
      { value: "mixer", label: "ミキサー車ドライバー" },
      { value: "trailer", label: "トレーラードライバー" },
      { value: "unic", label: "ユニック車ドライバー" },
      { value: "heavy-machine-op", label: "重機オペレーター" },
      { value: "delivery", label: "資材配送" },
      { value: "driver-other", label: "その他ドライバー・重機" },
    ],
  },
  {
    category: "management",
    label: "施工管理・現場監督",
    tagline: "建築 / 土木 / 電気設備 / 内装 の現場代理人 etc",
    subcategories: [
      { value: "kenchiku-sekou", label: "建築施工管理" },
      { value: "doboku-sekou", label: "土木施工管理" },
      { value: "denki-sekou", label: "電気施工管理" },
      { value: "kuchou-sekou", label: "空調・管工事施工管理" },
      { value: "naisou-sekou", label: "内装施工管理" },
      { value: "site-manager", label: "現場代理人・所長" },
      { value: "safety-manager", label: "安全管理者" },
      { value: "management-other", label: "その他施工管理" },
    ],
  },
  {
    category: "survey",
    label: "測量・設計",
    tagline: "測量士 / CAD オペ / 構造設計 / 意匠設計",
    subcategories: [
      { value: "surveyor", label: "測量士" },
      { value: "cad-op", label: "CAD オペレーター" },
      { value: "structural-design", label: "構造設計" },
      { value: "facility-design", label: "設備設計" },
      { value: "architectural-design", label: "意匠設計" },
      { value: "geological", label: "地質調査" },
      { value: "survey-other", label: "その他測量・設計" },
    ],
  },
  {
    category: "other",
    label: "その他",
    tagline: "上記に当てはまらない職種",
    subcategories: [
      { value: "construction-management", label: "建設業界の事務・管理" },
      { value: "real-estate", label: "不動産関連" },
      { value: "other-uncategorized", label: "その他" },
    ],
  },
]

/** スラッグから上位カテゴリを逆引き (ステップ間の保存値判定用) */
export function findCategoryBySubcategory(
  subSlug: string,
): CategoryValue | null {
  for (const group of CONSTRUCTION_JOB_GROUPS) {
    if (group.subcategories.some((s) => s.value === subSlug)) {
      return group.category
    }
  }
  return null
}

/** 経験年数の選択肢 (建設業向けに 6 段階に圧縮) */
export const EXPERIENCE_YEARS: Array<{ value: string; label: string }> = [
  { value: "none", label: "未経験" },
  { value: "lt1", label: "1 年未満" },
  { value: "1to3", label: "1〜3 年" },
  { value: "3to5", label: "3〜5 年" },
  { value: "5to10", label: "5〜10 年" },
  { value: "gt10", label: "10 年以上" },
]

/** 経験社数の選択肢 (粗いレンジ) */
export const COMPANY_COUNT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "0", label: "初めての転職" },
  { value: "1", label: "1 社" },
  { value: "2", label: "2 社" },
  { value: "3", label: "3 社" },
  { value: "4-5", label: "4〜5 社" },
  { value: "gt6", label: "6 社以上" },
]
