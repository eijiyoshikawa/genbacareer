/**
 * ハローワーク求人データの読みやすさ向上ヘルパー。
 *
 * HelloWork API の生データ（タイトルが description の機械的切り出し、
 * 待遇情報や勤務時間が長文の中に埋没など）を、求職者が一覧でスキャンしやすい
 * 形に整形する。
 *
 * - 取り込み時に使うもの: cleanTitle, extractTags, fallbackSalary
 * - 表示時に使うもの: extractWorkConditions, formatDescriptionSections
 *
 * @module job-enrichment
 */

// ========================================
// タイトル整形（取り込み時）
// ========================================

/**
 * HelloWork の機械切り出しタイトルを読みやすい形に正規化する。
 *
 * - 先頭の都道府県・郵便番号を除去（UI 側で別途表示する）
 * - 区切り文字（`/`, `／`, `■`, `◆`, `◎`）を整理
 * - 末尾の中途半端な切れ（句点・区切り・スペースで終わるよう調整）
 * - 80 字を超える場合、最後の句読点 / 区切り文字で trim
 */
export function cleanTitle(
  raw: string,
  prefecture: string | null | undefined
): string {
  let t = raw.trim()
  if (!t) return "求人"

  // 先頭の都道府県名 + 区切り を除去
  if (prefecture && t.startsWith(prefecture)) {
    t = t.slice(prefecture.length).replace(/^[\s\/／,，:：]+/, "")
  }

  // 郵便番号始まりを除去
  t = t.replace(/^〒?\d{3}-?\d{4}\s*/, "")

  // 装飾記号を空白に正規化
  t = t.replace(/[■◆◎●▼▲★☆※]/g, " ")
  t = t.replace(/[【】〔〕《》]/g, " ")

  // 連続スペース・全角空白を半角 1 つに
  t = t.replace(/[\s　]+/g, " ").trim()

  // 80 字以内に収まらないなら、最後の句点や区切りで切る
  if (t.length > 80) {
    const truncated = t.slice(0, 80)
    const lastBreak = Math.max(
      truncated.lastIndexOf("。"),
      truncated.lastIndexOf("、"),
      truncated.lastIndexOf("/"),
      truncated.lastIndexOf("／"),
      truncated.lastIndexOf(" ")
    )
    t = lastBreak > 30 ? truncated.slice(0, lastBreak).trim() : truncated.trim()
  }

  return t || "求人"
}

// ========================================
// 待遇タグ抽出（取り込み時）
// ========================================

/** 待遇タグ抽出ルール: 正規表現 → タグ表記の対応表。 */
const TAG_PATTERNS: Array<{ pattern: RegExp; tag: string }> = [
  { pattern: /未経験(?!不可)|経験不問|経験不要/, tag: "未経験OK" },
  { pattern: /学歴不問/, tag: "学歴不問" },
  { pattern: /年齢不問|年齢不問|シニア(歓迎|活躍)/, tag: "年齢不問" },
  { pattern: /資格(取得|支援)|免許.{0,3}支援/, tag: "資格取得支援" },
  { pattern: /寮(完備|あり|有)|社宅|住宅手当/, tag: "寮・社宅あり" },
  { pattern: /マイカー通勤(可|OK)|車通勤(可|OK)/, tag: "マイカー通勤可" },
  { pattern: /駅(徒歩|から)/, tag: "駅近" },
  { pattern: /賞与(あり|有|年[12]回)|ボーナス/, tag: "賞与あり" },
  { pattern: /昇給(あり|有|年1回)/, tag: "昇給あり" },
  { pattern: /退職金(あり|有|制度)/, tag: "退職金あり" },
  { pattern: /週休\s*[2２]\s*日|完全週休2日/, tag: "週休2日" },
  { pattern: /土日(祝)?休/, tag: "土日休み" },
  { pattern: /日払い|週払い|前払い/, tag: "日払い・週払い" },
  { pattern: /交通費(支給|全額)/, tag: "交通費支給" },
  { pattern: /社会保険(完備|あり)|社保完備/, tag: "社保完備" },
  { pattern: /制服(支給|貸与)|作業着支給/, tag: "制服支給" },
  { pattern: /残業.{0,3}(なし|無し|少な)/, tag: "残業少なめ" },
  { pattern: /日勤(のみ|だけ)/, tag: "日勤のみ" },
  { pattern: /長期休暇|GW|年末年始|お盆休み/, tag: "長期休暇あり" },
  { pattern: /女性(活躍|歓迎)/, tag: "女性歓迎" },
  { pattern: /外国人(可|歓迎|活躍)/, tag: "外国人歓迎" },
]

/** タグを 5 つのグループに分類するためのテーブル。 */
const TAG_GROUP_MAP: Record<string, TagGroup> = {
  // 経験・年齢
  "未経験OK": "experience",
  "学歴不問": "experience",
  "年齢不問": "experience",
  "女性歓迎": "experience",
  "外国人歓迎": "experience",
  // 賃金
  "賞与あり": "wage",
  "昇給あり": "wage",
  "退職金あり": "wage",
  "日払い・週払い": "wage",
  "交通費支給": "wage",
  // 福利厚生・働き方
  "寮・社宅あり": "benefits",
  "資格取得支援": "benefits",
  "社保完備": "benefits",
  "制服支給": "benefits",
  // 時間・休日・通勤
  "週休2日": "time",
  "土日休み": "time",
  "残業少なめ": "time",
  "日勤のみ": "time",
  "長期休暇あり": "time",
  "マイカー通勤可": "time",
  "駅近": "time",
}

export type TagGroup = "wage" | "benefits" | "experience" | "time"

/**
 * タグ配列を 4 グループに分類する（求人詳細の「この求人の特徴」表示用）。
 * 未定義のタグは "benefits" にフォールバックする。
 */
export function groupTags(tags: string[]): Record<TagGroup, string[]> {
  const out: Record<TagGroup, string[]> = {
    wage: [],
    benefits: [],
    experience: [],
    time: [],
  }
  for (const tag of tags) {
    const group = TAG_GROUP_MAP[tag] ?? "benefits"
    if (!out[group].includes(tag)) out[group].push(tag)
  }
  return out
}

export const TAG_GROUP_LABELS: Record<TagGroup, string> = {
  wage: "賃金",
  benefits: "福利厚生・働き方",
  experience: "経験・年齢",
  time: "時間・休日・通勤",
}

/**
 * 求人テキスト（title + description + requirements）から待遇タグを抽出する。
 * 重複は自動排除、最大 12 件まで。
 */
export function extractTags(...texts: Array<string | null | undefined>): string[] {
  const haystack = texts.filter(Boolean).join("\n")
  if (!haystack) return []

  const found: string[] = []
  for (const { pattern, tag } of TAG_PATTERNS) {
    if (pattern.test(haystack) && !found.includes(tag)) {
      found.push(tag)
      if (found.length >= 12) break
    }
  }
  return found
}

// ========================================
// 給与フォールバック抽出（取り込み時）
// ========================================

/**
 * salary{Min,Max} が null の場合に description / requirements から
 * 金額表記を抽出して埋める。
 *
 * 抽出パターン:
 * - 月給: `月給\s*\d{1,3}[,，]?\d{3}円`
 * - 時給: `時給\s*\d{2,4}円`
 * - 日給: `日給\s*\d{1,2}[,，]?\d{3}円`
 * - 年収: `年収\s*\d{2,4}万円`
 * - レンジ: `〜` / `~` / `から` で繋がれた 2 値
 */
export function fallbackSalary(
  text: string | null | undefined,
  current: { min: number | null; max: number | null; type: string | null }
): { min: number | null; max: number | null; type: string | null } {
  if (current.min !== null) return current // 既に値があれば触らない
  if (!text) return current

  // 月給優先で探す（最も一般的）
  const monthly = matchSalary(text, /月給[\s　]*([\d,，]+)\s*円?(?:\s*[〜~から-]\s*([\d,，]+)\s*円?)?/, "monthly")
  if (monthly) return monthly

  const hourly = matchSalary(text, /時給[\s　]*([\d,，]+)\s*円?(?:\s*[〜~から-]\s*([\d,，]+)\s*円?)?/, "hourly")
  if (hourly) return hourly

  const daily = matchSalary(text, /日給[\s　]*([\d,，]+)\s*円?(?:\s*[〜~から-]\s*([\d,，]+)\s*円?)?/, "daily")
  if (daily) return daily

  // 年収（万円単位）— レンジを先に試して、無ければ単一値
  const annualRange = text.match(
    /年収[\s　]*([\d,，]+)(?:\s*万円?)?\s*[〜~から-]\s*([\d,，]+)\s*万円?/
  )
  if (annualRange) {
    return {
      min: parseInt(annualRange[1].replace(/[,，]/g, ""), 10) * 10000,
      max: parseInt(annualRange[2].replace(/[,，]/g, ""), 10) * 10000,
      type: "annual",
    }
  }
  const annualSingle = text.match(/年収[\s　]*([\d,，]+)\s*万円?/)
  if (annualSingle) {
    return {
      min: parseInt(annualSingle[1].replace(/[,，]/g, ""), 10) * 10000,
      max: null,
      type: "annual",
    }
  }

  return current
}

function matchSalary(
  text: string,
  pattern: RegExp,
  type: "monthly" | "hourly" | "annual" | "daily"
): { min: number; max: number | null; type: string } | null {
  const m = text.match(pattern)
  if (!m) return null
  const min = parseInt(m[1].replace(/[,，]/g, ""), 10)
  if (Number.isNaN(min) || min <= 0) return null
  const max = m[2] ? parseInt(m[2].replace(/[,，]/g, ""), 10) : null
  return { min, max: Number.isNaN(max ?? 0) ? null : max, type }
}

// ========================================
// 勤務条件抽出（表示時）
// ========================================

export interface WorkConditions {
  /** 勤務時間 (例: "9:00〜18:00") */
  workingHours: string | null
  /** 休日 (例: "土日祝休み") */
  holidays: string | null
  /** 通勤・アクセス (例: "○○駅 徒歩 5 分 / マイカー通勤可") */
  accessNote: string | null
  /** 加入保険 (例: "社会保険完備") */
  insurance: string | null
}

/**
 * description / requirements から勤務条件を抽出する（表示時に呼ぶ）。
 * 取り込みデータを変更しないので、抽出ロジックの調整が後付けで可能。
 */
export function extractWorkConditions(
  ...texts: Array<string | null | undefined>
): WorkConditions {
  const haystack = texts.filter(Boolean).join("\n")
  if (!haystack) {
    return { workingHours: null, holidays: null, accessNote: null, insurance: null }
  }

  // 勤務時間: HH:MM〜HH:MM
  const hoursMatch = haystack.match(
    /(\d{1,2}[:：]\d{2})\s*[〜~から-]\s*(\d{1,2}[:：]\d{2})/
  )
  const workingHours = hoursMatch
    ? `${hoursMatch[1].replace("：", ":")}〜${hoursMatch[2].replace("：", ":")}`
    : null

  // 休日
  let holidays: string | null = null
  if (/完全週休2日/.test(haystack)) holidays = "完全週休2日"
  else if (/週休\s*[2２]\s*日/.test(haystack)) holidays = "週休2日"
  else if (/土日祝休/.test(haystack)) holidays = "土日祝休み"
  else if (/土日休/.test(haystack)) holidays = "土日休み"
  else if (/シフト制/.test(haystack)) holidays = "シフト制"
  else if (/日祝休/.test(haystack)) holidays = "日祝休み"

  // 通勤
  const access: string[] = []
  const station = haystack.match(/(\S{2,10})駅\s*(?:から|より)?\s*徒歩\s*(\d{1,2})\s*分/)
  if (station) access.push(`${station[1]}駅 徒歩${station[2]}分`)
  if (/マイカー通勤(可|OK)|車通勤(可|OK)/.test(haystack)) access.push("マイカー通勤可")
  if (/自転車通勤(可|OK)/.test(haystack)) access.push("自転車通勤可")
  const accessNote = access.length > 0 ? access.join(" / ") : null

  // 保険
  let insurance: string | null = null
  if (/社会保険完備|社保完備/.test(haystack)) insurance = "社会保険完備"
  else if (/雇用[\s・]保険|労災[\s・]保険|健康保険|厚生年金/.test(haystack)) {
    const items: string[] = []
    if (/雇用保険/.test(haystack)) items.push("雇用")
    if (/労災保険/.test(haystack)) items.push("労災")
    if (/健康保険/.test(haystack)) items.push("健康")
    if (/厚生年金/.test(haystack)) items.push("厚生年金")
    insurance = items.length > 0 ? items.join("・") : null
  }

  return { workingHours, holidays, accessNote, insurance }
}

// ========================================
// description セクション分割（表示時）
// ========================================

export interface DescriptionSection {
  heading: string | null
  body: string
}

/**
 * description を 【見出し】 や ■見出し で分割し、見出し付きセクションの配列にする。
 * 見出しが無いプレーンテキストは `[{ heading: null, body }]` として返す。
 */
export function formatDescriptionSections(
  description: string | null | undefined
): DescriptionSection[] {
  if (!description) return []
  const text = description.trim()
  if (!text) return []

  // 【...】 / 〔...〕 / ■...見出し系: 見出しの直前で split
  const sectionRegex = /(?=【[^】]{1,30}】|■[^\n]{1,30}|◆[^\n]{1,30})/g
  const parts = text.split(sectionRegex).filter((s) => s.trim())

  if (parts.length === 0) {
    return [{ heading: null, body: text }]
  }

  return parts.map((part) => {
    const headingMatch = part.match(/^(?:【([^】]{1,30})】|■\s*([^\n]{1,30})|◆\s*([^\n]{1,30}))/)
    if (headingMatch) {
      const heading = (headingMatch[1] || headingMatch[2] || headingMatch[3]).trim()
      const body = part.slice(headingMatch[0].length).trim()
      return { heading, body }
    }
    return { heading: null, body: part.trim() }
  })
}
