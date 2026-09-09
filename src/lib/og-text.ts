// next/og (satori) fetches a dynamic Google Font per glyph segment. Symbols
// outside the font's covered ranges (decorative marks like ◇☆★□ often used
// in job titles, fullwidth tilde, emoji, etc.) 400 on that fetch, which used
// to crash the whole OGP image route. Map known offenders to visually
// equivalent CJK glyphs that are already covered by the fonts used elsewhere
// on the page, and drop anything else outside the known-safe ranges instead
// of trying to enumerate every possible unsupported symbol.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// ASCII + fullwidth alphanumerics + CJK punctuation/kana/ideographs — the
// ranges next/og's dynamic font reliably covers. Notably excludes Geometric
// Shapes / Misc Symbols / Dingbats (★☆◇◆□■ etc.) and the fullwidth tilde
// (U+FF5E), which have all been observed to fail the font fetch.
const OG_SAFE_TEXT_PATTERN =
  /[^ -~　-〿぀-ゟ゠-ヿ一-鿿０-９Ａ-Ｚａ-ｚ]/g

export function sanitizeOgText(text: string): string {
  const replaced = text.replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
  return replaced.replace(OG_SAFE_TEXT_PATTERN, " ").replace(/\s+/g, " ").trim()
}
