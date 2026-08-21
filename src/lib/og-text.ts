// next/og (satori) fetches a dynamic Google Font per glyph segment. Some symbols
// have no matching font and the fetch 400s, silently dropping the character from
// the rendered OGP image. Map known offenders to visually equivalent CJK glyphs
// that are already covered by the fonts used elsewhere on the page.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// 求人タイトルに頻出する装飾記号（Geometric Shapes / Arrows / Misc Symbols ブロック）
// も同じ理由で動的フォント取得が 400 になり文字が欠落する
// (本番で ◇ U+25C7 / □ U+25A1 / ★ U+2605 / ⇔ U+21D4 を確認、いずれも個別記号を
// ホワイトリストするより該当ブロックごと除去した方が今後の再発に強い)。
// 意味を持たない装飾目的の記号なので、視覚的な置換先を探すより単純に除去する。
const OG_TEXT_STRIP_PATTERN = /[←-⇿☀-⛿■-◿]/g

export function sanitizeOgText(text: string): string {
  return text
    .replace(/[≪≫]/g, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
    .replace(OG_TEXT_STRIP_PATTERN, "")
    .replace(/\s+/g, " ")
    .trim()
}
