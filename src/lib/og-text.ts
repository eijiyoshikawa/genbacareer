// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, which throws and fails the entire
// OGP image (not just that glyph). Two mitigations:
// - angle brackets used as quote marks: map to visually equivalent CJK glyphs
//   that are already covered by the fonts used elsewhere on the page.
// - decorative bullet symbols (job titles are often wrapped like "◇未経験歓迎◇"
//   or "★高収入★"): strip outright, since they carry no meaning on their own
//   and next/og has no reliable fallback font for the Geometric Shapes block.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}
const OG_TEXT_STRIP = /[◇◆☆★■□●○▲△▼▽]/g

export function sanitizeOgText(text: string): string {
  return text
    .replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
    .replace(OG_TEXT_STRIP, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}
