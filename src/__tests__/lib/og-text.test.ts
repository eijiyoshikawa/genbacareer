import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

// next/og の動的フォント解決で 400 になる文字が 1 つでも残ると、
// その文字だけでなく同じセグメントの日本語ごと OGP 画像から消える。
// 下の 2 群は実際に detect -> css2 -> フォント本体の取得を通して確認した結果。
const BROKEN =
  "★☆◆◇●○■□▲▼△▽◎♦♣♠♥♡☎☏✓☑✔✕✖✿❤❗❓⇒⇔⇧⇨※℃±≦≧∀∞√☀☂☃♨⭐✨℡‥―‐≪≫"
const RENDERS_FINE = "→←↑↓×÷≠♪♫①②③④⑤⑥⑦⑧⑨⑩…・〜～＝＋〒㈱㈲№㎡㎏㎞"

describe("sanitizeOgText", () => {
  it("leaves no glyph that breaks next/og font loading", () => {
    const out = sanitizeOgText(BROKEN)
    const survivors = [...out].filter((ch) => BROKEN.includes(ch))
    expect(survivors).toEqual([])
  })

  it("preserves characters that render correctly", () => {
    expect(sanitizeOgText(RENDERS_FINE)).toBe(RENDERS_FINE)
  })

  it("keeps Japanese text untouched", () => {
    expect(sanitizeOgText("鳶職人を募集しています")).toBe(
      "鳶職人を募集しています"
    )
  })

  it("maps double angle brackets to their CJK equivalents", () => {
    expect(sanitizeOgText("≪急募≫")).toBe("《急募》")
  })

  it("preserves meaning for symbols that have an equivalent", () => {
    expect(sanitizeOgText("未経験⇒月収30万")).toBe("未経験→月収30万")
    expect(sanitizeOgText("※要普通免許")).toBe("＊要普通免許")
    expect(sanitizeOgText("✓社会保険完備")).toBe("・社会保険完備")
  })

  it("collapses decorative symbols instead of gluing words together", () => {
    expect(sanitizeOgText("大工★内装")).toBe("大工 内装")
    expect(sanitizeOgText("★★★高収入★★★")).toBe("高収入")
  })

  it("returns an empty string when the input is only decoration", () => {
    // 呼び出し側はこの空文字を見て既定タイトルにフォールバックする
    expect(sanitizeOgText("◆◇◆◇")).toBe("")
  })
})
