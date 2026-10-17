// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, which breaks the ENTIRE OGP image
// render (not just that glyph). Job titles frequently contain decorative symbols
// (◇◆★☆■●▲ など) that trigger this.
//
// Strategy:
//  1) Map a few symbols to visually-equivalent CJK glyphs already covered by the
//     page fonts.
//  2) Strip decorative glyphs in the Unicode blocks that have no fetchable font.
//     These are purely decorative in titles, so removing them is safe.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// Decorative symbol blocks that 400 on dynamic font fetch:
//  - Geometric Shapes            U+25A0–U+25FF (■ □ ◆ ◇ ○ ● ◎ ▲ △ …)
//  - Misc Symbols + Dingbats     U+2600–U+27BF (★ ☆ ♪ ☀ ✓ ✶ ❤ …)
//  - Misc Symbols and Arrows     U+2B00–U+2BFF (⬛ ⭐ …)
//  - Emoji variation selectors   U+FE00–U+FE0F
// NOTE: Arrows (U+2190–21FF), enclosed numbers (①…), and CJK brackets (【】《》)
// are intentionally NOT dropped — they carry meaning and are font-covered.
const OG_DROP_RANGES = /[■-◿☀-➿⬀-⯿︀-️]/g

export function sanitizeOgText(text: string): string {
  return text
    .replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
    .replace(OG_DROP_RANGES, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}
