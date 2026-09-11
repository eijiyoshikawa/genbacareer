/**
 * LINE webhook 用の AI 自動応答（Claude Haiku）。
 *
 * キーワード応答に該当しない自由質問に対して、ゲンバキャリアの担当者風の
 * 短いテキストを生成する。建設業 / 求人 / 応募フローの文脈を system prompt に固定。
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY — 未設定なら null を返す（運用上影響なし）
 *
 * モデル: claude-haiku-4-5（軽量・低コスト・高速）
 *
 * Prompt caching:
 *   system prompt は 5 分以上のセッションで cache hit するよう cache_control を付与。
 *   会話単発でも 1 リクエストあたりのコストはほぼ無視できるが、運用負荷で
 *   毎日数百回叩く場合の節約効果がある。
 */

import Anthropic from "@anthropic-ai/sdk"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

const SYSTEM_PROMPT = `あなたは建設業に特化した求人サイト「ゲンバキャリア」の LINE 公式アカウントの担当者です。

【サイト情報】
- 建築・土木・電気・内装・解体・ドライバー・施工管理・測量 の 8 カテゴリの建設業求人を扱う
- 全国 47 都道府県の求人を掲載
- 求人検索 URL: ${SITE_URL}/jobs
- 料金（求職者の方）: 完全無料
- 運営: 株式会社 LET（大阪府大阪市）

【あなたの役割】
- ユーザーの質問に親しみやすく丁寧に答える
- 建設業に関する一般的な質問にも答える（資格取得、給与相場、業界動向 等）
- 求人に関する質問は、検索 URL を案内しつつ「キーワード」を絞り込む提案をする
- 答えがわからない / 個別対応が必要な質問は「担当者からご連絡します」と返す

【絶対ルール】
- 200 文字以内、敬語、絵文字は最大 2 個まで
- LINE 既存の応答（FAQ / オプトアウト 等）と矛盾する応答はしない
- 個人情報を尋ねない
- 政治・宗教・差別的な話題は丁寧に回避
- 価格について断定しない（成果報酬は「1 名 49.8 万円〜（職種による）」が確定情報）
`

let _client: Anthropic | null = null
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  return _client
}

export function isAiReplyConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY
}

/**
 * ユーザーメッセージに対する AI 応答を 1 つ生成する。
 * 設定なし / エラー / コンテンツ違反時は null を返す（FAQ パターン応答にフォールバック）。
 *
 * @param userMessage  ユーザーが送ってきたテキスト
 * @param userName    （任意）ユーザーの LINE 表示名。挨拶に使う。
 */
export async function generateAiReply(
  userMessage: string,
  userName?: string | null
): Promise<string | null> {
  const client = getClient()
  if (!client) return null

  // 長文や URL のみメッセージはスキップ
  const trimmed = userMessage.trim()
  if (trimmed.length === 0 || trimmed.length > 500) return null

  try {
    const userPrefix = userName ? `（${userName} さんからのメッセージ）\n` : ""
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 300,
      // system prompt を cache 対象に（5 分以内の再リクエストで input tokens 課金が安くなる）
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `${userPrefix}${trimmed}`,
        },
      ],
    })

    const block = response.content[0]
    if (!block || block.type !== "text") return null
    const text = block.text.trim()
    if (text.length === 0) return null
    // system prompt の「200 文字以内」はモデルへの指示に過ぎず強制力が無い。
    // プロンプトインジェクション等で無視された場合に備え、コード側でも
    // 上限を強制する（LINE の 1 メッセージとして不自然に長い返信が
    // そのまま顧客に届くのを防ぐ、最終防御ライン）。
    const MAX_REPLY_CHARS = 400
    return text.length > MAX_REPLY_CHARS
      ? `${text.slice(0, MAX_REPLY_CHARS)}…`
      : text
  } catch (e) {
    console.warn(`[ai-reply] failed: ${e instanceof Error ? e.message : e}`)
    return null
  }
}
