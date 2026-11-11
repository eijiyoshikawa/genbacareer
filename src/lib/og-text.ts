// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, silently dropping the character from
// the rendered OGP image and logging "Failed to load dynamic font" as a runtime
// error. Map known offenders to visually equivalent CJK glyphs that are already
// covered by the Japanese font used elsewhere on the image.
//
// 本番ログで確認済みの 400: ≪ ≫ (数学記号) / ◇ □ (幾何学模様)。
// 求人タイトルでは ◆◇■□●○★☆ 等の装飾記号が頻出するため、文字単位の
// 後追いではなくブロック単位 (数学記号・幾何学模様・その他記号) で
// 中黒「・」に置換する。【】《》などの CJK 括弧は問題ないので対象外。
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// U+2200–22FF Mathematical Operators / U+25A0–25FF Geometric Shapes /
// U+2600–26FF Miscellaneous Symbols (★☆♪ 等) / U+2B00–2BFF Misc Symbols and Arrows
const UNSUPPORTED_SYMBOLS = /[∀-⋿■-◿☀-⛿⬀-⯿]/g

export function sanitizeOgText(text: string): string {
  return text
    .replace(UNSUPPORTED_SYMBOLS, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? "・")
    .replace(/・{2,}/g, "・")
    .replace(/^[・\s]+|[・\s]+$/g, "")
}
