// next/og (satori) fetches a dynamic Google Font per glyph segment. Symbols outside
// the fonts' covered ranges (decorative marks like ◇ ○ ★ that recruiters commonly
// put in job titles) 400 on fetch, throwing and failing the whole image. Map known
// offenders to visually equivalent CJK glyphs already covered by the page fonts,
// and strip anything else outside the safe ranges below rather than reactively
// chasing each new symbol found in production logs.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
  "◇": "○",
  "◆": "●",
  "□": "○",
  "■": "●",
  "☆": "○",
  "★": "●",
  "▲": "○",
  "▼": "○",
}

// Latin/digits, common punctuation, and the Japanese ranges (hiragana, katakana,
// CJK ideographs, CJK/fullwidth punctuation) that the page fonts actually cover.
const OG_SAFE_CHAR = /[ -~　-ヿ㐀-䶿一-鿿＀-￯]/

export function sanitizeOgText(text: string): string {
  return Array.from(text)
    .map((ch) => OG_TEXT_REPLACEMENTS[ch] ?? (OG_SAFE_CHAR.test(ch) ? ch : ""))
    .join("")
}
