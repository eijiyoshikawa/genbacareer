/**
 * 建設業向け「適職診断」のロジック。
 *
 * 設問への回答（選択肢）が各職種カテゴリにスコアを加点し、
 * 合計上位を「向いている職種」として返す。DB 不要の純ロジック。
 * カテゴリキーは src/lib/categories.ts の value と一致させる。
 */

export type CatKey =
  | "construction"
  | "civil"
  | "electrical"
  | "interior"
  | "demolition"
  | "driver"
  | "management"
  | "survey"

export type ShindanOption = {
  label: string
  scores: Partial<Record<CatKey, number>>
}

export type ShindanQuestion = {
  id: string
  text: string
  options: ShindanOption[]
}

export const SHINDAN_QUESTIONS: ShindanQuestion[] = [
  {
    id: "q1",
    text: "仕事で一番大事にしたいことは？",
    options: [
      { label: "とにかく稼ぎたい", scores: { construction: 2, civil: 2, driver: 2 } },
      { label: "手に職をつけたい", scores: { electrical: 2, interior: 2, survey: 1 } },
      { label: "人をまとめたい", scores: { management: 3 } },
      { label: "体を動かしたい", scores: { construction: 2, demolition: 2, civil: 1 } },
    ],
  },
  {
    id: "q2",
    text: "体力に自信は？",
    options: [
      { label: "かなりある", scores: { construction: 2, demolition: 2, civil: 1 } },
      { label: "人並みにある", scores: { driver: 1, interior: 1, electrical: 1 } },
      { label: "体力より段取りで勝負", scores: { management: 2, survey: 2 } },
    ],
  },
  {
    id: "q3",
    text: "細かい作業は得意？",
    options: [
      { label: "得意・好き", scores: { electrical: 2, interior: 2, survey: 1 } },
      { label: "ダイナミックな作業が好き", scores: { demolition: 2, civil: 2, driver: 1 } },
      { label: "どちらでもいける", scores: { construction: 1, management: 1 } },
    ],
  },
  {
    id: "q4",
    text: "どんな働き方が理想？",
    options: [
      { label: "一人で黙々と", scores: { driver: 2, survey: 2 } },
      { label: "チームで協力して", scores: { construction: 2, civil: 1, management: 1 } },
      { label: "職人技を極めたい", scores: { electrical: 2, interior: 2 } },
    ],
  },
  {
    id: "q5",
    text: "図面や数字は？",
    options: [
      { label: "得意・好き", scores: { survey: 2, management: 2, electrical: 1 } },
      { label: "苦手、現場で動きたい", scores: { construction: 2, demolition: 1, driver: 1 } },
    ],
  },
  {
    id: "q6",
    text: "運転は好き？",
    options: [
      { label: "大好き・運転で稼ぎたい", scores: { driver: 3 } },
      { label: "普通", scores: { construction: 1, civil: 1 } },
      { label: "あまり乗らない", scores: { interior: 1, electrical: 1, survey: 1 } },
    ],
  },
  {
    id: "q7",
    text: "将来の目標に近いのは？",
    options: [
      { label: "独立して一人前の職人に", scores: { construction: 2, electrical: 1, interior: 1 } },
      { label: "現場監督・管理職になりたい", scores: { management: 3 } },
      { label: "安定して長く働きたい", scores: { driver: 1, civil: 2, survey: 1 } },
    ],
  },
  {
    id: "q8",
    text: "一番ワクワクするのは？",
    options: [
      { label: "建物を建てる", scores: { construction: 3 } },
      { label: "道路・橋などインフラを造る", scores: { civil: 3 } },
      { label: "電気・配管・空調を扱う", scores: { electrical: 3 } },
      { label: "内装・仕上げで空間をつくる", scores: { interior: 3 } },
      { label: "解体・リサイクル", scores: { demolition: 3 } },
      { label: "重機・トラックを操る", scores: { driver: 3 } },
      { label: "全体の管理・段取り", scores: { management: 3 } },
      { label: "測量・設計", scores: { survey: 3 } },
    ],
  },
]

/**
 * 選択した選択肢からカテゴリ別の合計スコアを集計して返す。
 */
export function tallyShindan(answers: ShindanOption[]): Record<CatKey, number> {
  const total: Record<CatKey, number> = {
    construction: 0,
    civil: 0,
    electrical: 0,
    interior: 0,
    demolition: 0,
    driver: 0,
    management: 0,
    survey: 0,
  }
  for (const a of answers) {
    for (const [k, v] of Object.entries(a.scores)) {
      total[k as CatKey] += v ?? 0
    }
  }
  return total
}

/**
 * 選択した選択肢の配列からスコア集計し、上位カテゴリを降順で返す。
 * 同点はカテゴリ定義順で安定。
 */
export function scoreShindan(answers: ShindanOption[]): CatKey[] {
  const order: CatKey[] = [
    "construction",
    "civil",
    "electrical",
    "interior",
    "demolition",
    "driver",
    "management",
    "survey",
  ]
  const total = tallyShindan(answers)
  return order
    .filter((k) => total[k] > 0)
    .sort((a, b) => total[b] - total[a] || order.indexOf(a) - order.indexOf(b))
}

/** 結果カテゴリの一言コメント */
export const CAT_BLURB: Record<CatKey, string> = {
  construction: "建物をゼロから形にする、建設の花形。体力と達成感を求める人に。",
  civil: "道路・橋・トンネルなど社会基盤を支える。スケールの大きい仕事が好きな人に。",
  electrical: "電気・配管・空調のプロ。手に職をつけて長く食べていきたい人に。",
  interior: "内装・仕上げで空間を完成させる。細やかな作業とセンスを活かせる人に。",
  demolition: "解体・産廃でダイナミックに。豪快な作業が好きな人に。",
  driver: "ダンプ・重機で現場を動かす。運転が好きで一人の時間も苦にならない人に。",
  management: "現場監督・施工管理。段取りとマネジメントでキャリアを築きたい人に。",
  survey: "測量・設計で現場の精度を支える。図面や数字が得意な人に。",
}
