// next/og (satori) fetches a dynamic Google Font per glyph segment. Symbols
// outside the covered ranges (geometric shapes ◇□, arrows ⇒⇔, emoji, etc.)
// have no matching font and the fetch 400s, which fails the whole OGP image
// render for that job posting. New offending symbols keep showing up in job
// titles one at a time (◇ ⇒ □ ＜＞ …), so instead of allowlisting each one as
// it's reported, keep only characters from ranges known to render (ASCII,
// hiragana/katakana/kanji, CJK & fullwidth punctuation) and drop everything
// else. A couple of known lookalikes are mapped to their CJK equivalents
// first so they still display something meaningful rather than being cut.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
}

// 全角英数・記号 (U+FF01-FF5E) を対応する半角 ASCII に正規化する。
// 本番では「Fullwidth Forms」ブロック内の記号（＜＞ 等）ですらフォント未対応で
// 失敗した実績があり、ブロック単位での安全判定ができない。個別 allowlist の代わりに
// ASCII と同じ見た目の文字は ASCII 側へ寄せて確実に描画できる範囲に収める。
function toHalfwidthAscii(text: string): string {
  return text.replace(/[！-～]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  )
}

const SAFE_OG_CHAR = new RegExp(
  "[\\u0020-\\u007E" + // ASCII
    "\\u3000-\\u303F" + // CJK symbols & punctuation (、。「」『』〜 etc.)
    "\\u3040-\\u309F" + // ひらがな
    "\\u30A0-\\u30FF" + // カタカナ
    "\\u3400-\\u4DBF" + // CJK拡張A（稀な漢字）
    "\\u4E00-\\u9FFF" + // CJK統合漢字
    "]",
)

export function sanitizeOgText(text: string): string {
  const normalized = toHalfwidthAscii(text).replace(
    /[≪≫]/g,
    (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch,
  )
  return Array.from(normalized)
    .filter((ch) => SAFE_OG_CHAR.test(ch))
    .join("")
}
