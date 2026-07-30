// next/og (satori) fetches a dynamic Google Font per glyph segment. Symbols
// outside the font's coverage (math operators, geometric shapes, dingbats,
// emoji, etc.) 400 on that fetch and crash the whole OGP image route.
// Free-text fields (job titles, company names) come from companies and
// regularly contain decorative bullet/arrow glyphs we can't fully enumerate,
// so map the known offenders to visually equivalent CJK glyphs first, then
// strip anything else outside the font's known-safe range instead of
// reactively growing a per-glyph allowlist after every new production error.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// ASCII + common Japanese ranges (hiragana/katakana/half-width katakana,
// CJK ideographs, CJK/fullwidth punctuation) that the OGP font covers.
const OG_SAFE_CHAR = /[ -~　-〿぀-ヿ＀-ﾟ一-鿿]/

export function sanitizeOgText(text: string): string {
  return Array.from(text.replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch))
    .filter((ch) => OG_SAFE_CHAR.test(ch))
    .join("")
}
