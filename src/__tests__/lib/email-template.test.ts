import { describe, it, expect } from "vitest"
import {
  renderEmailLayout,
  renderEmailText,
  formatExpiry,
  escapeHtml,
  baseUrl,
} from "@/lib/email-template"

describe("formatExpiry", () => {
  it("formats date in Japanese with weekday", () => {
    // 2026-05-21 is Thursday (木)
    const d = new Date("2026-05-21T00:00:00+09:00")
    const formatted = formatExpiry(d)
    expect(formatted).toMatch(/2026 年 5 月 21 日（木）/)
  })

  it("handles single-digit month/day", () => {
    const d = new Date("2026-01-03T00:00:00+09:00")
    expect(formatExpiry(d)).toContain("2026 年 1 月 3 日")
  })
})

describe("escapeHtml", () => {
  it("escapes script tags", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    )
  })

  it("escapes quotes and amps", () => {
    expect(escapeHtml(`"a" & 'b'`)).toBe("&quot;a&quot; &amp; &#39;b&#39;")
  })
})

describe("baseUrl", () => {
  it("returns env or localhost fallback", () => {
    expect(baseUrl()).toMatch(/^https?:\/\//)
  })
})

describe("renderEmailLayout", () => {
  it("contains brand header and footer", () => {
    const html = renderEmailLayout({
      paragraphs: ["test content"],
    })
    expect(html).toContain("ゲンバキャリア")
    expect(html).toContain("株式会社LET")
    expect(html).toContain("ヘルプ")
    expect(html).toContain("プライバシー")
    expect(html).toContain("利用規約")
  })

  it("escapes paragraph content (XSS prevention)", () => {
    const html = renderEmailLayout({
      paragraphs: ["<script>alert(1)</script>"],
    })
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;")
  })

  it("renders primary CTA with brand orange", () => {
    const html = renderEmailLayout({
      cta: { label: "クリック", url: "https://example.com", variant: "primary" },
    })
    expect(html).toContain("#e25c0e")
    expect(html).toContain("https://example.com")
    expect(html).toContain("クリック")
  })

  it("renders success CTA with green", () => {
    const html = renderEmailLayout({
      cta: { label: "go", url: "https://example.com", variant: "success" },
    })
    expect(html).toContain("#16a34a")
  })

  it("renders kv table", () => {
    const html = renderEmailLayout({
      kvHeading: "応募情報",
      kv: [
        { label: "求人", value: "建設施工管理" },
        { label: "応募者", value: "山田 太郎" },
      ],
    })
    expect(html).toContain("応募情報")
    expect(html).toContain("建設施工管理")
    expect(html).toContain("山田 太郎")
  })

  it("renders expiry block when expiresAt provided", () => {
    const html = renderEmailLayout({
      expiresAt: new Date("2026-05-21T00:00:00+09:00"),
    })
    expect(html).toMatch(/有効期限/)
    expect(html).toContain("2026 年 5 月 21 日")
  })

  it("renders unsubscribe block when provided", () => {
    const html = renderEmailLayout({
      unsubscribe: {
        label: "通知設定を開く",
        url: "https://example.com/settings",
      },
    })
    expect(html).toContain("通知設定を開く")
    expect(html).toContain("配信を停止")
  })

  it("hides auto-send notice when showAutoSendNotice=false", () => {
    const html = renderEmailLayout({
      showAutoSendNotice: false,
      paragraphs: ["body"],
    })
    expect(html).not.toContain("自動送信しています")
  })

  it("shows auto-send notice by default", () => {
    const html = renderEmailLayout({
      paragraphs: ["body"],
    })
    expect(html).toContain("自動送信しています")
  })

  it("includes preheader as hidden div", () => {
    const html = renderEmailLayout({
      preheader: "受信箱プレビュー",
      paragraphs: ["body"],
    })
    expect(html).toContain("受信箱プレビュー")
    expect(html).toContain("display:none")
  })

  it("filters null/empty paragraphs", () => {
    const html = renderEmailLayout({
      paragraphs: ["valid", "", null, undefined, "   "],
    })
    expect(html).toContain("valid")
    // 段落数: valid のみ。<p> 段落タグの数を数える
    const paragraphTags = (html.match(/<p style="margin:0 0 16px/g) ?? []).length
    expect(paragraphTags).toBe(1)
  })

  it("converts newlines to <br> within paragraph", () => {
    const html = renderEmailLayout({
      paragraphs: ["line1\nline2"],
    })
    expect(html).toContain("line1<br>line2")
  })
})

describe("renderEmailText", () => {
  it("includes brand line + footer", () => {
    const text = renderEmailText({ paragraphs: ["test"] })
    expect(text).toContain("ゲンバキャリア")
    expect(text).toContain("株式会社LET")
  })

  it("does NOT include raw HTML", () => {
    const text = renderEmailText({
      paragraphs: ["body"],
      cta: { label: "click", url: "https://example.com" },
    })
    expect(text).not.toContain("<")
    expect(text).not.toContain(">")
  })

  it("renders CTA as label + URL", () => {
    const text = renderEmailText({
      cta: { label: "クリック", url: "https://example.com/foo" },
    })
    expect(text).toContain("▼ クリック")
    expect(text).toContain("https://example.com/foo")
  })

  it("renders kv as indented list", () => {
    const text = renderEmailText({
      kv: [{ label: "求人", value: "施工管理" }],
    })
    expect(text).toContain("  求人: 施工管理")
  })

  it("renders unsubscribe link", () => {
    const text = renderEmailText({
      unsubscribe: { label: "停止", url: "https://example.com/u" },
    })
    expect(text).toContain("配信停止: 停止")
    expect(text).toContain("https://example.com/u")
  })
})
