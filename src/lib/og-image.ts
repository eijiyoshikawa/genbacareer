/**
 * next/og の ImageResponse は、デフォルトフォントに無いグリフ (★ ◇ ■ などの装飾記号・絵文字) を
 * 検出すると Google Fonts から動的にサブセットを取得しようとする。求人タイトルや企業名に
 * よく使われるこれらの記号がフォント側に存在しないと "Failed to download dynamic font.
 * Status: 400" で画像生成自体が失敗する (本番 /jobs/[id]/opengraph-image 等で継続的に発生)。
 * DB 由来のテキストを OG 画像に描画する前に必ずこれを通し、該当記号を除去する。
 */
const OG_UNSAFE_SYMBOL_PATTERN =
  /[☀-➿⬀-⯿■-◿️\u{1F000}-\u{1FFFF}]/gu

export function sanitizeOgText(text: string): string {
  return text
    .replace(OG_UNSAFE_SYMBOL_PATTERN, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim()
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + "…"
}
