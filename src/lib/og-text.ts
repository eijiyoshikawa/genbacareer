// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s ("Failed to load dynamic font for ◇"),
// which logs a runtime error and silently drops the character from the image.
// Map known offenders to visually equivalent CJK glyphs, and turn decorative
// symbols (◇□■★● / dingbats / emoji, often used as bullets in HelloWork titles)
// into spaces so the surrounding words stay separated.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// U+25A0–25FF Geometric Shapes, U+2600–27BF Misc Symbols + Dingbats,
// U+2B00–2BFF Misc Symbols and Arrows, plus emoji pictographs / variation selectors.
const DECORATIVE_SYMBOLS =
  /[■-◿☀-➿⬀-⯿️‍]|\p{Extended_Pictographic}/gu

export function sanitizeOgText(text: string): string {
  return text
    .replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
    .replace(DECORATIVE_SYMBOLS, " ")
    .replace(/[ 　]{2,}/g, " ")
    .trim()
}
