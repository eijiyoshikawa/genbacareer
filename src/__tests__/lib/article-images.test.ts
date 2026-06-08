import { describe, it, expect } from "vitest"
import {
  assignImages,
  insertImagesIntoBody,
  hasAutoImages,
  stripAutoImages,
  shuffleWithSeed,
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

  it("stripAutoImages removes inserted figures (round-trip restores original)", () => {
    const body = "<h2>H</h2><p>P1</p><p>P2</p><p>P3</p>"
    const withImgs = insertImagesIntoBody(body, imgs)
    expect(hasAutoImages(withImgs)).toBe(true)
    const stripped = stripAutoImages(withImgs)
    expect(hasAutoImages(stripped)).toBe(false)
    expect(stripped).toBe(body)
  })

  it("reassign flow: strip then re-insert different images works", () => {
    const body = "<p>P1</p><p>P2</p>"
    const first = insertImagesIntoBody(body, imgs)
    const reassigned = insertImagesIntoBody(stripAutoImages(first), [
      { url: "https://x/9.jpg", alt: "t" },
      { url: "https://x/8.jpg", alt: "t" },
    ])
    expect(reassigned).toContain("9.jpg")
    expect(reassigned).not.toContain("1.jpg")
    expect((reassigned.match(/data-auto-img/g) ?? []).length).toBe(2)
  })
})

describe("shuffleWithSeed", () => {
  it("is a permutation (same elements, deterministic per seed)", () => {
    const arr = Array.from({ length: 20 }, (_, i) => i)
    const a = shuffleWithSeed(arr, 42)
    const b = shuffleWithSeed(arr, 42)
    expect(a).toEqual(b) // 決定的
    expect([...a].sort((x, y) => x - y)).toEqual(arr) // 要素は不変
    expect(a).not.toEqual(arr) // 並びは変わる
  })
  it("different seeds give different orders", () => {
    const arr = Array.from({ length: 50 }, (_, i) => i)
    expect(shuffleWithSeed(arr, 1)).not.toEqual(shuffleWithSeed(arr, 2))
  })
  it("does not mutate the input", () => {
    const arr = [1, 2, 3, 4, 5]
    const copy = [...arr]
    shuffleWithSeed(arr, 7)
    expect(arr).toEqual(copy)
  })
})
