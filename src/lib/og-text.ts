// next/og (satori) fetches a dynamic Google Font per glyph segment. Characters
// outside the base Latin/Japanese coverage (decorative dingbats/geometric
// shapes/arrows commonly used in job-ad copy, e.g. ◇◆★☆⇔□) have no matching
// font and the fetch 400s, breaking the whole OGP image render — not just
// dropping the character. Map known offenders to visually equivalent CJK
// glyphs that are already covered by the fonts used elsewhere on the page,
// then strip anything else outside the safe range instead of allowlisting
// each newly seen symbol one at a time.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

const UNSAFE_OG_TEXT_PATTERN =
  /[^ -~　-〿぀-ゟ゠-ヿ＀-￯一-鿿]/g

export function sanitizeOgText(text: string): string {
  const mapped = text.replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
  return mapped
    .replace(UNSAFE_OG_TEXT_PATTERN, " ")
    .replace(/\s+/g, " ")
    .trim()
}
