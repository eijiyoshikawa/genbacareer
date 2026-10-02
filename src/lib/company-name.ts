/**
 * 会社名の表記ゆれ正規化。
 *
 * HelloWork 由来の事業所名などは「株式会社　○○」のように法人格と社名の
 * 間に空白（全角/半角）が入っていることが多い。表示上不自然なので、
 * 法人格トークンに隣接する空白だけを詰める。
 *
 * - 前株: 「株式会社 ○○」→「株式会社○○」
 * - 後株: 「○○ 株式会社」→「○○株式会社」
 *
 * 社名内部の空白（例: 「○○ ＆ △△」）は意図的な可能性があるため触らない。
 */

// 長いものから先にマッチさせる（医療法人社団 を 医療法人 より先に）
const CORP_TYPES = [
  "特定非営利活動法人",
  "一般社団法人",
  "一般財団法人",
  "公益社団法人",
  "公益財団法人",
  "医療法人社団",
  "医療法人財団",
  "社会福祉法人",
  "医療法人",
  "学校法人",
  "宗教法人",
  "事業協同組合",
  "協同組合",
  "株式会社",
  "有限会社",
  "合同会社",
  "合資会社",
  "合名会社",
]

// 半角スペース類 + 全角スペース(　)
const SP = "[\\s\\u3000]+"

const PREFIX_RES = CORP_TYPES.map(
  (t) => new RegExp(`^(${t})${SP}`)
)
const SUFFIX_RES = CORP_TYPES.map(
  (t) => new RegExp(`${SP}(${t})$`)
)

/**
 * 法人格と社名の間の空白を詰める。前後の余分な空白も trim する。
 * null/undefined はそのまま空文字へ。
 */
export function normalizeCompanyName(raw: string | null | undefined): string {
  if (!raw) return ""
  let s = raw.trim()
  for (const re of PREFIX_RES) s = s.replace(re, "$1")
  for (const re of SUFFIX_RES) s = s.replace(re, "$1")
  return s
}
