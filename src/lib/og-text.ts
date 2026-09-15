/**
 * next/og の ImageResponse は組み込みフォントに無い文字（絵文字・装飾記号など）を
 * Google Fonts から動的取得しようとし、対象グリフが見つからないと
 * "Failed to download dynamic font. Status: 400" で例外になる
 * (/jobs/[id]/opengraph-image で本番発生: 求人タイトル中の ◇ 等の記号が原因)。
 * OG 画像に載せる自由入力テキストは日本語・英数字・一般的な記号のみを許可し、
 * それ以外は除去して動的フォント取得自体を発生させない。
 */
const OG_UNSAFE_CHARS =
  /[^ -~　-〿぀-ゟ゠-ヿ一-鿿＀-￯]/gu

export function sanitizeOgText(input: string): string {
  return input.replace(OG_UNSAFE_CHARS, "").replace(/\s+/g, " ").trim()
}
