/**
 * 日本語の賃金テキストから salaryType / salaryMin / salaryMax を抽出する。
 *
 * 主にハローワーク求人の `khky` 由来テキスト（`baseSalary` カラム）を対象に、
 * 構造化カラム（`chgnkeitai_kagen` / `chgnkeitai_jgn` / `chgnkeitai`）が空だった
 * 求人を救うために使う。
 *
 * 想定する入力フォーマット:
 *   "月給 250,000円〜300,000円"
 *   "月給25万円〜30万円"
 *   "時給1,200円〜1,500円"
 *   "時給1,200円"
 *   "日給12,000円〜18,000円"
 *   "日給1万2,000円"
 *   "年俸500万円"
 *   "月給 ¥250,000～¥300,000"
 *
 * 出力:
 *   type: "monthly" | "hourly" | "annual" | "daily" | null
 *   min:  number | null  （extract できなかったら null）
 *   max:  number | null  （単一値 or 範囲表記がなければ null）
 *
 * 設計方針:
 *   - 「試用期間中：XX円」のような括弧書きは除外する（賃金本体を取りこぼさないため）
 *   - 全角数字・カンマ・〜/～/-/− を正規化
 *   - "25万円" の万単位を 10000 倍に正規化してから数値抽出
 */

export type SalaryType = "monthly" | "hourly" | "annual" | "daily"

export type ParsedSalary = {
  type: SalaryType | null
  min: number | null
  max: number | null
}

const TYPE_PATTERNS: Array<{ pattern: RegExp; type: SalaryType }> = [
  { pattern: /月給|月額/, type: "monthly" },
  { pattern: /時給|時間額/, type: "hourly" },
  { pattern: /年俸|年額|年収/, type: "annual" },
  { pattern: /日給|日額/, type: "daily" },
]

const SALARY_AMOUNT_BOUNDS: Record<
  SalaryType,
  { min: number; max: number }
> = {
  hourly: { min: 500, max: 50_000 },
  daily: { min: 3_000, max: 500_000 },
  monthly: { min: 50_000, max: 5_000_000 },
  annual: { min: 1_000_000, max: 50_000_000 },
}

function inferType(text: string): SalaryType | null {
  for (const { pattern, type } of TYPE_PATTERNS) {
    if (pattern.test(text)) return type
  }
  return null
}

/**
 * "月給25万円〜30万円（試用期間中：22万円）" のような文字列から、
 * 括弧書き（試用期間 / 残業代 / 賞与等）を除去する。
 * これをしないと「試用期間中の賃金」を本体の最低額として誤抽出してしまう。
 */
function stripParentheticals(text: string): string {
  return text
    .replace(/（[^）]*）/g, " ")
    .replace(/\([^)]*\)/g, " ")
    .replace(/【[^】]*】/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
}

/**
 * 全角→半角、カンマ除去、レンジ記号統一、円記号除去、"XX万[YY]" を実数値に展開。
 */
function normalize(text: string): string {
  let s = text.normalize("NFKC")
  s = s.replace(/[,，]/g, "")
  s = s.replace(/[～〜\-−ー]+/g, "~")
  s = s.replace(/[¥￥]/g, "")
  // "25万" → "250000", "25万5000" → "255000", "25万円" → "250000円"
  s = s.replace(/(\d+)万(\d+)?/g, (_, man: string, hi?: string) => {
    const manNum = parseInt(man, 10) * 10000
    const hiNum = hi ? parseInt(hi, 10) : 0
    return String(manNum + hiNum)
  })
  return s
}

/**
 * 配列から、賃金タイプの常識的レンジに収まる数値だけを残す。
 * 例: hourly なら 500〜50,000 円のみ採用。65（歳）や 2024（年）等のノイズを除外。
 */
function withinBounds(amount: number, type: SalaryType | null): boolean {
  if (type === null) return amount >= 500 && amount <= 50_000_000
  const b = SALARY_AMOUNT_BOUNDS[type]
  return amount >= b.min && amount <= b.max
}

/**
 * 賃金キーワード（月給・時給・日給・年俸）が含まれず種別を判定できない時、
 * 金額レンジから推定する。ハローワークの baseSalary (khky) は本文に種別語を
 * 含まないケースが大多数で、このフォールバックが無いと type=null になる。
 *
 * 凡そのレンジ:
 *   時給:  〜 5,000 円
 *   日給:  5,000 〜 30,000 円
 *   月給:  30,000 〜 1,500,000 円
 *   年俸:  1,500,000 円以上
 */
export function inferSalaryTypeFromAmount(
  amount: number | null
): SalaryType | null {
  if (amount === null || amount <= 0) return null
  if (amount < 5_000) return "hourly"
  if (amount < 30_000) return "daily"
  if (amount < 1_500_000) return "monthly"
  return "annual"
}

export function parseSalaryText(
  text: string | null | undefined
): ParsedSalary {
  if (text == null) return { type: null, min: null, max: null }
  const trimmed = text.trim()
  if (trimmed === "") return { type: null, min: null, max: null }

  const stripped = stripParentheticals(trimmed)
  const type = inferType(stripped) ?? inferType(trimmed)
  const normalized = normalize(stripped)

  const matches = normalized.match(/\d+/g)
  if (!matches) return { type, min: null, max: null }

  const numbers = matches
    .map((m) => parseInt(m, 10))
    .filter((n) => !isNaN(n) && withinBounds(n, type))

  if (numbers.length === 0) return { type, min: null, max: null }

  const min = numbers[0]
  const max =
    numbers.length > 1 && numbers[1] !== min ? numbers[1] : null

  // min/max が逆転していたら入れ替え
  if (max !== null && max < min) {
    return { type, min: max, max: min }
  }

  return { type, min, max }
}
