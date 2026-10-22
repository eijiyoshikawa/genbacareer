// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, silently dropping the character from
// the rendered OGP image (confirmed in production logs for ◇ / □, in addition to
// the previously-known ≪≫, on /jobs/[id]/opengraph-image). Map known offenders to
// ASCII or visually equivalent CJK glyphs that are already covered by the fonts
// used elsewhere on the page.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
  "◇": "*",
  "◆": "*",
  "□": "*",
  "■": "*",
}

const OG_TEXT_PATTERN = new RegExp(
  `[${Object.keys(OG_TEXT_REPLACEMENTS).join("")}]`,
  "g"
)

export function sanitizeOgText(text: string): string {
  return text.replace(OG_TEXT_PATTERN, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
}
