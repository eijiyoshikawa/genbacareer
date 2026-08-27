// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, which satori logs as a runtime error
// on every render (and in some cases fails the whole image response) instead of
// just dropping the glyph. Map known offenders to visually equivalent CJK glyphs
// that are already covered by the fonts used elsewhere on the page; decorative
// symbols with no CJK equivalent (common as title bullets, e.g. "◇急募◇") are
// stripped outright rather than left to fail per-request.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
  "◇": "",
  "◆": "",
  "□": "",
  "■": "",
  "⇔": "",
  "⇒": "→",
  "⇐": "←",
}

const OG_TEXT_UNSUPPORTED = new RegExp(
  `[${Object.keys(OG_TEXT_REPLACEMENTS).join("")}]`,
  "g"
)

export function sanitizeOgText(text: string): string {
  return text.replace(OG_TEXT_UNSUPPORTED, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? "")
}
