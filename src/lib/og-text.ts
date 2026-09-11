// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, silently dropping the character from
// the rendered OGP image. Map known offenders (common in construction job titles/
// taglines, e.g. "★未経験歓迎★", "施工面積50㎡", "①現場 ②事務") to ASCII or
// visually equivalent CJK glyphs that are already covered by the fonts used
// elsewhere on the page.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
  "★": "*",
  "☆": "*",
  "→": "->",
  "℡": "TEL",
  "㎡": "m2",
  "①": "(1)",
  "②": "(2)",
  "③": "(3)",
  "④": "(4)",
  "⑤": "(5)",
  "⑥": "(6)",
  "⑦": "(7)",
  "⑧": "(8)",
  "⑨": "(9)",
  "⑩": "(10)",
  "Ⅰ": "I",
  "Ⅱ": "II",
  "Ⅲ": "III",
  "Ⅳ": "IV",
  "Ⅴ": "V",
}

const OG_TEXT_PATTERN = new RegExp(
  `[${Object.keys(OG_TEXT_REPLACEMENTS).join("")}]`,
  "g"
)

export function sanitizeOgText(text: string): string {
  return text.replace(OG_TEXT_PATTERN, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
}
