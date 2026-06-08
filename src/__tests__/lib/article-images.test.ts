import { describe, it, expect } from "vitest"
import {
  assignImages,
  insertImagesIntoBody,
  hasAutoImages,
  escapeHtmlAttr,
  buildImageFigure,
  AUTO_IMAGE_MARKER,
} from "@/lib/article-images"

describe("assignImages", () => {
  it("rotates the pool so each article gets distinct hero + 2 body images", () => {
    const pool = ["a", "b", "c", "d", "e", "f"]
    const m = assignImages(["id1", "id2"], pool)
    expect(m.get("id1")).toEqual({ hero: "a", body: ["b", "c"] })
    expect(m.get("id2")).toEqual({ hero: "d", body: ["e", "f"] })
  })
  it("wraps around when pool is exhausted", () => {
    const pool = ["a", "b", "c", "d"]
    const m = assignImages(["id1", "id2"], pool)
    expect(m.get("id1")).toEqual({ hero: "a", body: ["b", "c"] })
    // base=3 → d, a, b
    expect(m.get("id2")).toEqual({ hero: "d", body: ["a", "b"] })
  })
  it("handles empty pool", () => {
    expect(assignImages(["id1"], []).size).toBe(0)
  })
})

describe("escapeHtmlAttr", () => {
  it("escapes special chars", () => {
    expect(escapeHtmlAttr('a&b<c>d"e')).toBe("a&amp;b&lt;c&gt;d&quot;e")
  })
})

describe("buildImageFigure", () => {
  it("produces a marked figure with escaped alt/url", () => {
    const f = buildImageFigure("https://x/y.jpg", '建設 "現場"')
    expect(f).toContain(AUTO_IMAGE_MARKER)
    expect(f).toContain('src="https://x/y.jpg"')
    expect(f).toContain("&quot;現場&quot;")
    expect(f).toContain('loading="lazy"')
  })
})

describe("insertImagesIntoBody", () => {
  const imgs = [
    { url: "https://x/1.jpg", alt: "記事タイトル" },
    { url: "https://x/2.jpg", alt: "記事タイトル" },
  ]

  it("inserts two images at first and middle paragraphs", () => {
    const body =
      "<h2>導入</h2><p>P1</p><p>P2</p><p>P3</p><p>P4</p>"
    const out = insertImagesIntoBody(body, imgs)
    const count = (out.match(/data-auto-img/g) ?? []).length
    expect(count).toBe(2)
    // 1枚目は最初の </p> 直後
    expect(out.indexOf("1.jpg")).toBeLessThan(out.indexOf("P2"))
    // 2枚目は中盤（P1 より後ろ）
    expect(out.indexOf("2.jpg")).toBeGreaterThan(out.indexOf("1.jpg"))
    // 段落は失われない
    expect(out).toContain("P4")
  })

  it("appends both at end when there are no paragraphs", () => {
    const body = "<div>本文だけ</div>"
    const out = insertImagesIntoBody(body, imgs)
    expect((out.match(/data-auto-img/g) ?? []).length).toBe(2)
    expect(out.startsWith(body)).toBe(true)
  })

  it("is idempotent: does nothing if already inserted", () => {
    const body = "<p>P1</p><p>P2</p>"
    const once = insertImagesIntoBody(body, imgs)
    const twice = insertImagesIntoBody(once, imgs)
    expect(twice).toBe(once)
    expect((twice.match(/data-auto-img/g) ?? []).length).toBe(2)
  })

  it("handles a single paragraph (both images after it)", () => {
    const body = "<p>only</p>"
    const out = insertImagesIntoBody(body, imgs)
    expect((out.match(/data-auto-img/g) ?? []).length).toBe(2)
    expect(out.indexOf("only")).toBeLessThan(out.indexOf("1.jpg"))
  })

  it("hasAutoImages detects the marker", () => {
    expect(hasAutoImages("<p>x</p>")).toBe(false)
    expect(hasAutoImages(insertImagesIntoBody("<p>x</p>", imgs))).toBe(true)
  })
})
