// next/og (satori) fetches a dynamic Google Font per glyph segment. Symbols outside
// the CJK font's coverage have no matching font and the fetch 400s, which throws and
// fails the whole OGP image (see ≪≫ in 2026-07, ★◇ in 2026-08 — free-text job titles
// keep introducing new decorative symbols companies use for emphasis, e.g. "★急募★").
// Map offenders with a natural CJK look-alike; strip everything else in the known
// unsupported symbol blocks instead of allowlisting one character at a time forever.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// Mathematical Operators (U+2200-22FF), Miscellaneous Technical (U+2300-23FF),
// Geometric Shapes (U+25A0-25FF), Miscellaneous Symbols (U+2600-26FF), Dingbats
// (U+2700-27BF), Miscellaneous Symbols and Arrows (U+2B00-2BFF) — none are covered
// by the dynamic CJK font next/og resolves for these pages.
const OG_UNSUPPORTED_SYMBOLS =
  /[∀-⋿⌀-⏿■-◿☀-⛿✀-➿⬀-⯿]/g

export function sanitizeOgText(text: string): string {
  return text
    .replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
    .replace(OG_UNSUPPORTED_SYMBOLS, "")
}
