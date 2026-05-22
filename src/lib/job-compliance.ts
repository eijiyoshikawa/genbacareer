/**
 * 求人広告のコンプライアンスチェック。
 *
 * 日本国内の求人広告に関わる法令:
 * - 雇用対策法 第10条 → 年齢制限の原則禁止 (例外あり)
 * - 男女雇用機会均等法 第5条 → 性別を理由とする差別的取扱い禁止
 * - 障害者雇用促進法 → 障害者差別禁止
 * - 職業安定法 第5条の4 → 国籍 / 信条による差別禁止
 *
 * このモジュールは静的なフレーズマッチで「疑わしい表現」を検出し、
 * 求人投稿者に warning を表示する。法的判断はしない（あくまで助言）。
 */

export type ComplianceIssue = {
  /** 検出した文字列 */
  match: string
  /** カテゴリ */
  category: "age" | "gender" | "nationality" | "appearance"
  /** 警告メッセージ */
  message: string
}

/**
 * 検出ルール。
 * 確実に違反になる表現と、例外的に許容される表現があるため、
 * 「警告 (warning)」として扱い、強制ブロックはしない。
 */
/**
 * 日本語は \b (word boundary) では区切れないため、明示的に文字列マッチで判定する。
 */
const RULES: Array<{
  pattern: RegExp
  category: ComplianceIssue["category"]
  message: string
}> = [
  // ----- 年齢制限 (雇用対策法 第10条) -----
  {
    pattern: /(\d{2}|十)歳?\s*(以下|未満|まで)/,
    category: "age",
    message:
      "「○歳以下 / 未満 / まで」のような年齢上限は雇用対策法で原則禁止です。長期キャリア形成等の例外を除き、年齢制限を外すか『長期勤続による』等の理由を明記してください。",
  },
  {
    pattern: /若手限定|若い方|若い人/,
    category: "age",
    message:
      "「若手限定」「若い方」は年齢差別と解釈される可能性があります。具体的な業務内容や必要スキルで表現することをお勧めします。",
  },
  {
    pattern: /(20|30|40)代(限定|のみ|まで|歓迎)/,
    category: "age",
    message:
      "年齢層を限定する表現は雇用対策法に抵触する可能性があります。「未経験歓迎」「長期勤続によるキャリア形成」等の客観的理由が必要です。",
  },

  // ----- 性別 (男女雇用機会均等法) -----
  {
    pattern: /(男性|女性)(のみ|限定|歓迎|だけ|を募集)/,
    category: "gender",
    message:
      "性別による募集制限は男女雇用機会均等法第 5 条に抵触します。「営業職」「事務職」のように職務内容で表現してください。",
  },
  {
    pattern: /(男子|女子)(募集|歓迎|限定)/,
    category: "gender",
    message:
      "性別を限定する募集は法令違反となる可能性があります。性別中立な表現に改めてください。",
  },
  {
    pattern: /(主婦|主夫)(限定|のみ)/,
    category: "gender",
    message:
      "婚姻状況による限定は差別的取扱いに該当する可能性があります。「家事との両立支援」等、サポートとしての記載に変更を推奨します。",
  },

  // ----- 国籍 (職業安定法) -----
  {
    pattern: /日本人(のみ|限定|だけ)/,
    category: "nationality",
    message:
      "国籍による募集制限は職業安定法に抵触します。業務遂行上必須の言語要件等は「日本語での会話・読み書きが必要」のように表現してください。",
  },
  {
    pattern: /外国人不可|日本国籍\s*必須/,
    category: "nationality",
    message:
      "国籍要件は職業安定法上、原則として記載できません。",
  },

  // ----- 容姿等 -----
  {
    pattern: /容姿端麗|見た目重視|ルックス重視/,
    category: "appearance",
    message:
      "容姿による募集条件は採用における人格的尊厳の保護の観点から不適切です。業務に必要なスキル・経験で表現してください。",
  },
]

/**
 * 求人テキストをチェックしてコンプライアンス上の懸念点を返す。
 * タイトル + 説明 + 採用要件 等を 1 つの文字列にまとめて渡す想定。
 */
export function checkJobCompliance(text: string): ComplianceIssue[] {
  if (!text) return []
  const found = new Map<string, ComplianceIssue>()
  for (const rule of RULES) {
    const m = text.match(rule.pattern)
    if (m) {
      const key = `${rule.category}:${m[0]}`
      if (!found.has(key)) {
        found.set(key, {
          match: m[0],
          category: rule.category,
          message: rule.message,
        })
      }
    }
  }
  return Array.from(found.values())
}

/**
 * 求人 1 件の各フィールドを連結してチェックする。
 */
export function checkJobFields(fields: {
  title?: string | null
  description?: string | null
  requirements?: string | null
}): ComplianceIssue[] {
  const text = [fields.title, fields.description, fields.requirements]
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .join("\n")
  return checkJobCompliance(text)
}
