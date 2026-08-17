/**
 * next/og の ImageResponse はグリフ毎に Google Fonts へ動的フェッチを行うが、
 * ★や◇のような装飾記号は解決できず 400 で例外になり画像生成全体が失敗する。
 * OG画像に渡す自由入力テキスト（求人タイトル・企業名等）はこれで許可済み文字に絞る。
 */
const ALLOWED_RANGES: Array<[number, number]> = [
  [0x0020, 0x007e], // 半角英数・記号 (printable ASCII)
  [0x00a5, 0x00a5], // ¥
  [0x2010, 0x2015], // ハイフン・ダッシュ類
  [0x2018, 0x201f], // 引用符
  [0x2026, 0x2026], // …
  [0x3000, 0x303f], // CJK記号 (、。「」【】・〜 等)
  [0x3040, 0x30ff], // ひらがな・カタカナ
  [0x31f0, 0x31ff], // カタカナ拡張
  [0x4e00, 0x9fff], // CJK統合漢字
  [0xff00, 0xffef], // 全角英数・半角カナ
]

function isAllowedCodePoint(code: number): boolean {
  return ALLOWED_RANGES.some(([start, end]) => code >= start && code <= end)
}

export function sanitizeOgText(text: string): string {
  const filtered = Array.from(text)
    .filter((ch) => isAllowedCodePoint(ch.codePointAt(0) ?? 0))
    .join("")
  return filtered.replace(/[ 　]{2,}/g, " ").trim()
}
