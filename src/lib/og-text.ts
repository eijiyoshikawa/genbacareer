// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, silently dropping the character from
// the rendered OGP image. Map known offenders to visually equivalent glyphs that
// are already covered by the fonts used elsewhere on the page.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
  "⇔": "/",
}

// Job titles are free text and keep introducing new decorative/technical symbols
// (★…★, ◇…◇, □…□) that hit the same 400. Rather than whack-a-mole individual
// characters as they show up, strip the Arrows / Math Operators / Misc Technical /
// Geometric Shapes / Misc Symbols / Dingbats blocks after the explicit
// replacements above have run. Deliberately skips Enclosed Alphanumerics
// (①②③…) and Box Drawing/Block Elements, which aren't known offenders and may
// be intentionally used. These are decorative in job-title context, so
// dropping them is safe.
const OG_UNSUPPORTED_SYMBOL_RANGE =
  /[←-⋿⌀-⏿■-◿☀-➿]/g

export function sanitizeOgText(text: string): string {
  return text
    .replace(/[≪≫⇔]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
    .replace(OG_UNSUPPORTED_SYMBOL_RANGE, "")
}
