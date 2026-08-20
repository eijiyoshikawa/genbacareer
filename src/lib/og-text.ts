// next/og (satori) resolves a Google font per glyph from the CSS `unicode-range`.
// Characters claimed by the symbol ranges are routed to Noto Sans Symbols /
// Symbols 2 and never fall back to the Japanese face, and for many of those
// glyphs Google's font-file endpoint answers 400. The loader resolves every font
// for a text segment with a single Promise.all, so one 400 throws away the font
// for the WHOLE segment — a lone ★ in a title can blank out the surrounding
// Japanese text, not just itself.
//
// Both lists below are empirical: every character was resolved through the same
// detect -> css2 -> font-file path next/og uses, and listed here only if that
// path actually failed. Replacement targets were checked the same way and are
// either unclaimed by the symbol fonts (so they reach the Japanese face) or
// served successfully by them.
//
// Characters confirmed to render and therefore deliberately NOT rewritten:
//   → ← ↑ ↓ × ÷ ≠ ♪ ♫ ① ② ③ ④ ⑤ ⑥ ⑦ ⑧ ⑨ ⑩ … ・ 〜 ～ ＝ ＋ 〒 ㈱ ㈲ № ㎡ ㎏ ㎞

// Broken glyphs that have a usable equivalent — meaning is preserved.
const OG_TEXT_REPLACEMENTS: Record<string, string> = {
  "≪": "《",
  "≫": "》",
  "⇒": "→",
  "⇨": "→",
  "⇔": "→",
  "⇧": "↑",
  "※": "＊",
  "✓": "・",
  "✔": "・",
  "☑": "・",
  "✕": "×",
  "✖": "×",
  "❗": "！",
  "❓": "？",
  "‥": "…",
  "―": "ー",
  "‐": "ー",
  "℃": "度",
  "℡": "TEL",
}

// Broken glyphs that are purely decorative (bullets, ornaments) or too rare to
// be worth a lossy transliteration. Replaced with a space rather than removed so
// that "大工★内装" keeps its word break; runs of them collapse away below.
const OG_TEXT_DROPPED =
  /[★☆◆◇●○■□▲▼△▽◎♦♣♠♥♡☎☏✿❤☀☂☃♨⭐✨±≦≧∀∞√]/g

const OG_TEXT_REPLACED = new RegExp(
  `[${Object.keys(OG_TEXT_REPLACEMENTS).join("")}]`,
  "g"
)

export function sanitizeOgText(text: string): string {
  return text
    .replace(OG_TEXT_REPLACED, (ch) => OG_TEXT_REPLACEMENTS[ch] ?? ch)
    .replace(OG_TEXT_DROPPED, " ")
    .replace(/\s+/g, " ")
    .trim()
}
