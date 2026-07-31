// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, silently dropping the character from
// the rendered OGP image. Map known offenders to visually equivalent CJK glyphs
// that are already covered by the fonts used elsewhere on the page.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// 2026-07-31 定期バグ検査: ≪≫ を個別対応した後も "◇" (装飾記号、求人タイトルで
// よく使われる) で同じ "Failed to load dynamic font" が本番で継続発生していた。
// 記号を 1 つずつ置換リストに追加する運用は際限がないため、既知の等価文字への
// 置換後、ASCII / 日本語 (ひらがな・カタカナ・漢字・全角記号) の範囲外にある
// 文字は丸ごと除去するフォールバックを追加する。
const UNSAFE_OG_CHARS =
  // ASCII / CJK 記号・句読点 (　-〿) / ひらがな (぀-ゟ) /
  // カタカナ (゠-ヿ) / CJK 統合漢字 (一-鿿) / 全角英数・記号 (＀-￯)
  /[^\x20-\x7E　-〿぀-ゟ゠-ヿ一-鿿＀-￯\n]/gu

export function sanitizeOgText(text: string): string {
  const normalized = text.replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
  return normalized.replace(UNSAFE_OG_CHARS, "")
}
