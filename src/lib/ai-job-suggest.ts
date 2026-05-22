/**
 * 求人投稿ウィザード向けの Claude Haiku ベース AI 提案。
 *
 * - タイトル候補（3 案）
 * - 仕事内容の本文ドラフト
 *
 * いずれも建設業に特化したトーン。ANTHROPIC_API_KEY が未設定なら null を返す。
 */

import Anthropic from "@anthropic-ai/sdk"

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export function isAiSuggestConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

const TITLE_SYSTEM_PROMPT = `あなたは建設業 / ノンデスク職の求人原稿ライターです。
求職者がスマートフォン検索で目に止めやすい「短く・具体的・職種が分かる」求人タイトルを 3 案提案します。

【絶対ルール】
- 各案 30 文字以内、絵文字なし
- 業務内容 / 勤務地 / 雇用形態が分かる固有名詞を含める
- 「急募」「高収入」「未経験 OK」などの煽り語を 1 つまで自然に織り込む
- 出力は JSON のみ。形式: { "titles": ["案1", "案2", "案3"] }
- 説明文・前置きは一切書かない`

const DESC_SYSTEM_PROMPT = `あなたは建設業 / ノンデスク職の求人原稿ライターです。
求人タイトル / カテゴリ / 勤務地 / 給与 / 福利厚生から「仕事内容」セクションのドラフトを書きます。

【絶対ルール】
- 300〜500 文字程度の日本語
- 段落 2〜3 個、冒頭は 1 行サマリ
- 主語は「あなた」または「弊社」
- 嘘・誇張は書かない。情報が無ければ抽象的に触れる程度に留める
- 出力は本文のみ。「以下のとおりです」等の前置きは書かない`

export async function generateTitleSuggestions(input: {
  category: string
  prefecture: string
  city?: string | null
  employmentType?: string | null
  salaryMin?: number | null
  salaryMax?: number | null
  tags?: string[]
}): Promise<string[] | null> {
  const client = getClient()
  if (!client) return null

  const userPrompt = [
    "次の条件で求人タイトル 3 案を作成してください。",
    `- 職種カテゴリ: ${input.category}`,
    `- 勤務地: ${input.prefecture}${input.city ? ` ${input.city}` : ""}`,
    input.employmentType ? `- 雇用形態: ${input.employmentType}` : null,
    input.salaryMin
      ? `- 給与下限: ${input.salaryMin.toLocaleString()} 円`
      : null,
    input.salaryMax
      ? `- 給与上限: ${input.salaryMax.toLocaleString()} 円`
      : null,
    input.tags?.length ? `- タグ: ${input.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 400,
      system: [
        { type: "text", text: TITLE_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    })

    const block = res.content[0]
    if (!block || block.type !== "text") return null

    const text = block.text.trim()
    // ```json などの code fence を剥がす
    const stripped = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/```$/i, "")
      .trim()

    const parsed = JSON.parse(stripped) as { titles?: unknown }
    if (!Array.isArray(parsed.titles)) return null
    const titles = parsed.titles
      .filter((t): t is string => typeof t === "string")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)
      .slice(0, 3)
    return titles.length > 0 ? titles : null
  } catch (e) {
    console.warn(`[ai-job-suggest] title failed: ${e instanceof Error ? e.message : e}`)
    return null
  }
}

export async function generateDescriptionDraft(input: {
  title: string
  category: string
  prefecture: string
  city?: string | null
  employmentType?: string | null
  salaryMin?: number | null
  salaryMax?: number | null
  benefits?: string[]
  tags?: string[]
}): Promise<string | null> {
  const client = getClient()
  if (!client) return null

  const userPrompt = [
    "次の求人条件から「仕事内容」セクションのドラフトを書いてください。",
    `- タイトル: ${input.title}`,
    `- 職種カテゴリ: ${input.category}`,
    `- 勤務地: ${input.prefecture}${input.city ? ` ${input.city}` : ""}`,
    input.employmentType ? `- 雇用形態: ${input.employmentType}` : null,
    input.salaryMin || input.salaryMax
      ? `- 給与: ${input.salaryMin?.toLocaleString() ?? "—"} 〜 ${input.salaryMax?.toLocaleString() ?? "—"} 円`
      : null,
    input.benefits?.length ? `- 福利厚生: ${input.benefits.join(", ")}` : null,
    input.tags?.length ? `- タグ: ${input.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join("\n")

  try {
    const res = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: [
        { type: "text", text: DESC_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userPrompt }],
    })

    const block = res.content[0]
    if (!block || block.type !== "text") return null
    const text = block.text.trim()
    return text.length > 0 ? text : null
  } catch (e) {
    console.warn(`[ai-job-suggest] desc failed: ${e instanceof Error ? e.message : e}`)
    return null
  }
}
