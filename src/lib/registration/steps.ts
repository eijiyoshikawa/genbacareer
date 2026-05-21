/**
 * 求職者登録ウィザードのステップ定義。
 *
 * 必須 4 + スキップ可 4 の計 8 ステップ。質問は可能な限り 1 画面に統合し、
 * マイナビ転職の 30+ ステップを 8 画面まで圧縮している。
 *
 * 各ステップの URL は /register/wizard/{slug} で、slug をハードコードで
 * 持つことで Next.js の dynamic route と相性良くする。
 */

export type StepDef = {
  /** 1-indexed の順番 (UI 表示用) */
  id: number
  /** URL スラッグ */
  slug: string
  /** ヘッダー表示 */
  title: string
  /** 補足説明 (任意) */
  description?: string
  /** 必須ステップか (false なら「スキップ」ボタン表示) */
  required: boolean
}

export const REGISTRATION_STEPS: StepDef[] = [
  // === 必須 4 ステップ ===
  {
    id: 1,
    slug: "address",
    title: "住まいエリア",
    description: "お住まいの都道府県を教えてください",
    required: true,
  },
  {
    id: 2,
    slug: "experience",
    title: "経験職種・年数",
    description: "経験のある建設業の職種をすべて選んでください",
    required: true,
  },
  {
    id: 3,
    slug: "condition",
    title: "希望条件",
    description: "勤務地・年収・転職時期を教えてください",
    required: true,
  },
  {
    id: 4,
    slug: "identity",
    title: "お名前・連絡先",
    description: "求人企業からの連絡に必要です",
    required: true,
  },
  // === スキップ可 4 ステップ ===
  {
    id: 5,
    slug: "job-detail",
    title: "現職について",
    description: "より良い求人マッチのために (スキップ可)",
    required: false,
  },
  {
    id: 6,
    slug: "license",
    title: "保有資格",
    description: "建設業で活かせる資格 (スキップ可)",
    required: false,
  },
  {
    id: 7,
    slug: "education",
    title: "学歴",
    description: "最終学歴のみ (スキップ可)",
    required: false,
  },
  {
    id: 8,
    slug: "preferences",
    title: "こだわり条件",
    description: "気になる働き方を選んでください (スキップ可)",
    required: false,
  },
]

export function getStepBySlug(slug: string): StepDef | null {
  return REGISTRATION_STEPS.find((s) => s.slug === slug) ?? null
}

export function getNextStep(currentSlug: string): StepDef | null {
  const i = REGISTRATION_STEPS.findIndex((s) => s.slug === currentSlug)
  if (i < 0 || i === REGISTRATION_STEPS.length - 1) return null
  return REGISTRATION_STEPS[i + 1]
}

export function getPrevStep(currentSlug: string): StepDef | null {
  const i = REGISTRATION_STEPS.findIndex((s) => s.slug === currentSlug)
  if (i <= 0) return null
  return REGISTRATION_STEPS[i - 1]
}

export const TOTAL_STEPS = REGISTRATION_STEPS.length
