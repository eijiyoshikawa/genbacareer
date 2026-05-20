import type { ConstructionCategoryValue } from "./categories"

/**
 * Prefecture × Category SEO LP のメタディスクリプション素材。
 *
 * 各カテゴリで頻出する職種キーワード・働き方フレーズを含めることで、
 * 検索エンジンに「その勤務地でその職種を探している」ユーザー意図を
 * マッチさせやすくする。description は 80〜120 字を目安に。
 */

type CategoryMeta = {
  /** description 中で使う「主な職種」フレーズ */
  jobs: string
  /** description 中で使う特徴・働き方フレーズ */
  workNote: string
}

const CATEGORY_META: Record<ConstructionCategoryValue, CategoryMeta> = {
  construction: {
    jobs: "大工・型枠・鉄筋・鳶・とび職・躯体",
    workNote: "未経験歓迎・職人見習いから一級技能士まで幅広く募集",
  },
  civil: {
    jobs: "土工・舗装・橋梁・トンネル・河川・造成",
    workNote: "公共工事案件多数・大型重機オペレーター歓迎",
  },
  electrical: {
    jobs: "電気工事士・空調設備・配管・消防設備・通信",
    workNote: "第二種電気工事士・施工管理技士の資格を活かせる",
  },
  interior: {
    jobs: "内装仕上げ・クロス・床貼り・タイル・左官",
    workNote: "新築・リフォーム両対応・短期から正社員まで",
  },
  demolition: {
    jobs: "解体工・産廃ドライバー・スクラップ・足場解体",
    workNote: "資格取得支援あり・日給高水準",
  },
  driver: {
    jobs: "ダンプ・ミキサー車・トレーラー・ユニック・重機オペ",
    workNote: "中型〜大型免許保持者歓迎・運行手当充実",
  },
  management: {
    jobs: "施工管理・現場監督・工事主任・安全管理",
    workNote: "1級・2級施工管理技士優遇・直行直帰可案件多数",
  },
  survey: {
    jobs: "測量士・補助・CADオペ・設計士・地質調査",
    workNote: "資格手当・現場経験者優遇・残業少なめ",
  },
}

/**
 * Prefecture ページ用 description (全カテゴリを含む建設業全般の SEO テキスト)。
 */
export function buildPrefectureDescription(prefLabel: string): string {
  return (
    `${prefLabel}の建設業界求人情報を一覧で検索。` +
    `建築・土木・電気設備・内装・解体・ドライバー・施工管理・測量設計の 8 職種に対応。` +
    `日給・月給・年収・正社員・契約社員などの条件で絞り込み可能。` +
    `現場で活躍する技能士・職人・若手歓迎の求人を多数掲載。`
  )
}

/**
 * Prefecture × Category ページ用 description。
 * カテゴリ固有の職種フレーズと働き方ノートを含める。
 */
export function buildPrefectureCategoryDescription(
  prefLabel: string,
  catLabel: string,
  catValue: ConstructionCategoryValue,
): string {
  const meta = CATEGORY_META[catValue]
  return (
    `${prefLabel}の${catLabel}求人を一覧で検索。` +
    `${meta.jobs}など建設現場の主要職種を網羅。${meta.workNote}。` +
    `給与・勤務地・雇用形態・経験不問など希望条件で絞り込みできます。`
  )
}
