/**
 * タイトル + 説明文から建設業 9 カテゴリへの分類を推定するルールベース判定。
 * 7.1 クロール求人タグ付け / 8.2 カテゴリ判定テスト の基盤。
 *
 * 仕組み:
 *   - 各カテゴリに対して複数のキーワード辞書を持ち、出現頻度を加点
 *   - 最大スコアのカテゴリを採用
 *   - スコア閾値以下なら "other" (信頼度 0)
 *
 * LLM ベースの判定 (9.7 と同じ Claude API) で精度を上げる場合は、
 * このルールベース結果を seed として渡す想定。
 */

import { CATEGORIES } from "./categories"

type CategoryValue = (typeof CATEGORIES)[number]["value"]

const KEYWORDS: Record<CategoryValue, string[]> = {
  construction: [
    "建築", "躯体", "鉄筋", "型枠", "とび", "鳶", "足場", "大工", "鉄骨",
    "コンクリート", "基礎", "新築", "改修", "リフォーム",
  ],
  civil: [
    "土木", "道路", "舗装", "土工", "造成", "河川", "橋梁", "トンネル",
    "下水", "上水", "シールド", "推進", "外構",
  ],
  electrical: [
    "電気", "電気工事", "電工", "電気設備", "配線", "配管", "空調", "給排水",
    "設備工事", "管工事", "衛生設備", "弱電", "通信工事", "照明",
  ],
  interior: [
    "内装", "内装工事", "クロス", "壁紙", "床", "フローリング", "クッションフロア",
    "塗装", "左官", "タイル", "防水", "シーリング", "石工",
  ],
  demolition: [
    "解体", "解体工事", "産廃", "産業廃棄物", "アスベスト", "石綿",
    "リサイクル", "廃材",
  ],
  driver: [
    "ドライバー", "運転手", "重機", "クレーン", "ユンボ", "オペレーター",
    "オペ", "ダンプ", "トラック", "フォークリフト", "玉掛け",
  ],
  management: [
    "施工管理", "現場監督", "監督", "工事監理", "工程管理", "品質管理",
    "安全管理", "建築士", "技術者", "現場代理人", "主任技術者",
  ],
  survey: [
    "測量", "測量士", "設計", "設計士", "CAD", "BIM", "図面", "意匠",
    "構造設計", "設備設計",
  ],
  other: [],
}

export interface CategoryGuessResult {
  category: CategoryValue
  confidence: number // 0.0-1.0
  scores: Record<CategoryValue, number>
  matchedKeywords: string[]
}

/**
 * タイトル + 説明文からカテゴリを推定。
 *
 * - 各カテゴリのキーワード辞書とのマッチ件数で加点
 * - 最大スコアのカテゴリ採用、スコア 0 なら "other"
 * - 信頼度 = 採用カテゴリのスコア / 全カテゴリスコア合計
 */
export function guessCategory(input: {
  title: string
  description?: string | null
}): CategoryGuessResult {
  const text = `${input.title} ${input.description ?? ""}`.toLowerCase()
  const scores = {} as Record<CategoryValue, number>
  const matched: string[] = []

  for (const c of CATEGORIES) {
    const keywords = KEYWORDS[c.value as CategoryValue]
    let s = 0
    for (const kw of keywords) {
      // 出現回数をカウント (case-insensitive、簡易部分一致)
      const lower = kw.toLowerCase()
      let idx = 0
      let count = 0
      while ((idx = text.indexOf(lower, idx)) !== -1) {
        count++
        idx += lower.length
        if (count >= 5) break // 1 keyword 5 回まで
      }
      if (count > 0) {
        s += count
        matched.push(kw)
      }
    }
    scores[c.value as CategoryValue] = s
  }

  // 最大スコア
  let best: CategoryValue = "other"
  let bestScore = 0
  for (const c of CATEGORIES) {
    const v = c.value as CategoryValue
    if (scores[v] > bestScore) {
      bestScore = scores[v]
      best = v
    }
  }

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0)
  const confidence = totalScore > 0 ? bestScore / totalScore : 0

  return {
    category: bestScore > 0 ? best : "other",
    confidence,
    scores,
    matchedKeywords: matched,
  }
}
