import { describe, it, expect } from "vitest"
import { parseVideoUrl, parseVideoUrls } from "@/lib/video-embed"

describe("parseVideoUrl", () => {
  it("YouTube は横長（portrait=false）", () => {
    const v = parseVideoUrl("https://youtu.be/abcdefghijk")
    expect(v?.provider).toBe("youtube")
    expect(v?.embedUrl).toBe("https://www.youtube.com/embed/abcdefghijk")
    expect(v?.portrait).toBe(false)
  })

  it("YouTube Shorts も embed に正規化される", () => {
    const v = parseVideoUrl("https://www.youtube.com/shorts/abcdefghijk")
    expect(v?.provider).toBe("youtube")
    expect(v?.embedUrl).toBe("https://www.youtube.com/embed/abcdefghijk")
    expect(v?.portrait).toBe(false)
  })

  it("TikTok は縦型（portrait=true）", () => {
    const v = parseVideoUrl(
      "https://www.tiktok.com/@user/video/1234567890123456789"
    )
    expect(v?.provider).toBe("tiktok")
    expect(v?.embedUrl).toBe(
      "https://www.tiktok.com/embed/v2/1234567890123456789"
    )
    expect(v?.portrait).toBe(true)
  })

  it("Vimeo は横長（portrait=false）", () => {
    const v = parseVideoUrl("https://vimeo.com/123456789")
    expect(v?.provider).toBe("vimeo")
    expect(v?.embedUrl).toBe("https://player.vimeo.com/video/123456789")
    expect(v?.portrait).toBe(false)
  })

  it("Instagram の投稿 /p/ は縦型 embed になる", () => {
    const v = parseVideoUrl("https://www.instagram.com/p/AbCdEf123/")
    expect(v?.provider).toBe("instagram")
    expect(v?.embedUrl).toBe("https://www.instagram.com/p/AbCdEf123/embed/")
    expect(v?.portrait).toBe(true)
  })

  it("Instagram のリール /reel/ も種別を保持して embed 化", () => {
    const v = parseVideoUrl("https://www.instagram.com/reel/XyZ_987/")
    expect(v?.provider).toBe("instagram")
    expect(v?.embedUrl).toBe("https://www.instagram.com/reel/XyZ_987/embed/")
    expect(v?.portrait).toBe(true)
  })

  it("未対応 URL は null", () => {
    expect(parseVideoUrl("https://example.com/foo")).toBeNull()
    expect(parseVideoUrl("not a url")).toBeNull()
  })
})

describe("parseVideoUrls", () => {
  it("対応分だけ抽出し、未対応はスキップする", () => {
    const out = parseVideoUrls([
      "https://youtu.be/abcdefghijk",
      "https://example.com/x",
      "https://www.instagram.com/reel/XyZ_987/",
    ])
    expect(out).toHaveLength(2)
    expect(out.map((v) => v.provider)).toEqual(["youtube", "instagram"])
  })
})
