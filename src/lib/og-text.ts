// next/og (satori) fetches a dynamic Google Font per glyph segment. Symbols outside
// that font's coverage (decorative marks like ◇ □ ★, emoji, etc.) 400 on fetch,
// which throws and breaks the entire OGP image render rather than just dropping the
// character. Map known offenders to visually equivalent glyphs that are already
// covered by the fonts used elsewhere on the page, and strip anything else outside
// the safe ASCII/Japanese ranges as a fallback so a single unmapped glyph can never
// crash the image again (maintaining an ever-growing per-character list doesn't scale).
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《", // ≪ -> 《
  "≫": "》", // ≫ -> 》
  "㎡": "m2", // 面積表記
  "℡": "TEL", // 電話番号表記
}

// Basic Latin, general punctuation dashes/quotes/ellipsis, CJK symbols & punctuation,
// Hiragana, Katakana, CJK Unified Ideographs, fullwidth forms, fullwidth currency.
const SAFE_TEXT_PATTERN =
  /[ -~‐-―‘-‟…　-〿ぁ-ゖ゠-ヿ一-鿿！-｠￠-￥]/

const REPLACEMENT_PATTERN = new RegExp(
  `[${Object.keys(OG_TEXT_REPLACEMENTS).join("")}]`,
  "g"
)

export function sanitizeOgText(text: string): string {
  const replaced = text.replace(REPLACEMENT_PATTERN, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
  return Array.from(replaced)
    .filter((ch) => SAFE_TEXT_PATTERN.test(ch))
    .join("")
}
