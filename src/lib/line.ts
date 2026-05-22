/**
 * LINE 公式アカウントへの応募導線ヘルパー。
 *
 * ハローワーク求人・自社掲載求人の応募はすべて LINE 公式アカウントの
 * チャットへ集約する設計。求人タイトルや ID などを事前入力した状態で
 * LINE アプリ（または LINE Web）が開くように URL を組み立てる。
 *
 * @module line
 */

/** Vercel 環境変数 `LINE_OA_ID` に設定する公式アカウントの Basic ID。 */
const LINE_OA_ID = process.env.LINE_OA_ID ?? process.env.NEXT_PUBLIC_LINE_OA_ID ?? ""

/** クライアントから参照する用の公式アカウント Basic ID。 */
export const PUBLIC_LINE_OA_ID = process.env.NEXT_PUBLIC_LINE_OA_ID ?? ""

export interface LineApplyContext {
  jobId: string
  title: string
  prefecture: string
  city?: string | null
  helloworkId?: string | null
}

/**
 * 求人情報から LINE 事前入力メッセージを生成する。
 * LINE 側で改行は通常通り扱われるので `\n` で区切る。
 */
export function buildLineMessage(ctx: LineApplyContext): string {
  const lines = [
    "【応募希望】",
    `求人タイトル: ${ctx.title}`,
    `求人ID: ${ctx.helloworkId ?? ctx.jobId}`,
    `勤務地: ${[ctx.prefecture, ctx.city].filter(Boolean).join(" ")}`,
    "",
    "上記の求人に応募を希望します。",
    "差し支えなければお名前・連絡先をご記入ください。",
  ]
  return lines.join("\n")
}

/**
 * LINE 公式アカウントとのチャット画面を開く URL を生成する。
 *
 * 形式: https://line.me/R/oaMessage/{BASIC_ID}/?{URL_ENCODED_TEXT}
 *
 * - モバイル: LINE アプリが起動して事前入力メッセージ付きでチャット画面に
 * - デスクトップ: LINE for PC か LINE Web に遷移
 */
export function buildLineApplyUrl(
  ctx: LineApplyContext,
  basicId: string = LINE_OA_ID
): string {
  if (!basicId) {
    // 未設定時はトップに戻る安全な URL
    return "/"
  }
  // Basic ID の先頭の "@" は URL では不要（line.me 側で受け付けないため）
  const id = basicId.startsWith("@") ? basicId.slice(1) : basicId
  const message = buildLineMessage(ctx)
  return `https://line.me/R/oaMessage/${encodeURIComponent(id)}/?${encodeURIComponent(message)}`
}

/**
 * 公式アカウントを友達追加するための QR コード / リンク URL。
 * LINE 未インストールのデスクトップユーザー向け。
 */
export function buildLineFriendAddUrl(basicId: string = LINE_OA_ID): string {
  if (!basicId) return "/"
  const idWithAt = basicId.startsWith("@") ? basicId : `@${basicId}`
  return `https://line.me/R/ti/p/${encodeURIComponent(idWithAt)}`
}

/** LINE_OA_ID が設定されているかどうか。表示時のフォールバック判定に使う。 */
export function isLineConfigured(basicId: string = LINE_OA_ID): boolean {
  return !!basicId && basicId !== ""
}
