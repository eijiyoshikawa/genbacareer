/**
 * 動画 URL から埋め込み用 iframe URL とプロバイダ名を導出するヘルパー。
 *
 * 対応プロバイダ:
 *   - YouTube (youtube.com, youtu.be)
 *   - TikTok (tiktok.com)
 *   - Vimeo (vimeo.com)
 *
 * 不正な URL や未対応プロバイダは null を返す。
 */

export type VideoProvider = "youtube" | "tiktok" | "vimeo"

export interface VideoEmbed {
  provider: VideoProvider
  // iframe の src に入れる URL
  embedUrl: string
  // 元の URL (リンクアウト用)
  originalUrl: string
}

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/
const TIKTOK_VIDEO_ID_RE = /\/video\/(\d+)/
const VIMEO_ID_RE = /(?:\/video\/|vimeo\.com\/)(\d+)/

export function parseVideoUrl(raw: string): VideoEmbed | null {
  if (!raw) return null
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    return null
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "")

  // YouTube
  if (host === "youtu.be") {
    const id = url.pathname.slice(1)
    if (YOUTUBE_ID_RE.test(id)) {
      return {
        provider: "youtube",
        embedUrl: `https://www.youtube.com/embed/${id}`,
        originalUrl: raw,
      }
    }
  }
  if (host === "youtube.com" || host === "m.youtube.com") {
    if (url.pathname === "/watch") {
      const id = url.searchParams.get("v") ?? ""
      if (YOUTUBE_ID_RE.test(id)) {
        return {
          provider: "youtube",
          embedUrl: `https://www.youtube.com/embed/${id}`,
          originalUrl: raw,
        }
      }
    }
    if (url.pathname.startsWith("/shorts/")) {
      const id = url.pathname.split("/")[2] ?? ""
      if (YOUTUBE_ID_RE.test(id)) {
        return {
          provider: "youtube",
          embedUrl: `https://www.youtube.com/embed/${id}`,
          originalUrl: raw,
        }
      }
    }
    if (url.pathname.startsWith("/embed/")) {
      const id = url.pathname.split("/")[2] ?? ""
      if (YOUTUBE_ID_RE.test(id)) {
        return {
          provider: "youtube",
          embedUrl: `https://www.youtube.com/embed/${id}`,
          originalUrl: raw,
        }
      }
    }
  }

  // TikTok
  if (host === "tiktok.com" || host === "vm.tiktok.com") {
    const m = url.pathname.match(TIKTOK_VIDEO_ID_RE)
    if (m) {
      return {
        provider: "tiktok",
        embedUrl: `https://www.tiktok.com/embed/v2/${m[1]}`,
        originalUrl: raw,
      }
    }
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const m = url.pathname.match(VIMEO_ID_RE) ?? raw.match(VIMEO_ID_RE)
    if (m) {
      return {
        provider: "vimeo",
        embedUrl: `https://player.vimeo.com/video/${m[1]}`,
        originalUrl: raw,
      }
    }
  }

  return null
}

export function parseVideoUrls(urls: string[]): VideoEmbed[] {
  return urls
    .map((u) => parseVideoUrl(u))
    .filter((v): v is VideoEmbed => v !== null)
}
