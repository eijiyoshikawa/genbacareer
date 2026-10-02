/**
 * 動画 URL から埋め込み用 iframe URL とプロバイダ名を導出するヘルパー。
 *
 * 対応プロバイダ:
 *   - YouTube (youtube.com, youtu.be)
 *   - TikTok (tiktok.com)
 *   - Vimeo (vimeo.com)
 *   - Instagram (instagram.com の 投稿 /p/ ・リール /reel/ ・IGTV /tv/)
 *
 * 不正な URL や未対応プロバイダは null を返す。
 */

export type VideoProvider = "youtube" | "tiktok" | "vimeo" | "instagram"

export interface VideoEmbed {
  provider: VideoProvider
  // iframe の src に入れる URL
  embedUrl: string
  // 元の URL (リンクアウト用)
  originalUrl: string
  /**
   * 縦型（ポートレート）の埋め込みか。
   * TikTok / Instagram は投稿全体が縦長のため、表示側で縦型コンテナを使う。
   */
  portrait: boolean
}

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/
const TIKTOK_VIDEO_ID_RE = /\/video\/(\d+)/
const VIMEO_ID_RE = /(?:\/video\/|vimeo\.com\/)(\d+)/
const INSTAGRAM_RE = /^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/

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
        portrait: false,
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
          portrait: false,
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
          portrait: false,
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
          portrait: false,
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
        portrait: true,
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
        portrait: false,
      }
    }
  }

  // Instagram（投稿 /p/・リール /reel/・IGTV /tv/）
  if (host === "instagram.com" || host === "m.instagram.com") {
    const m = url.pathname.match(INSTAGRAM_RE)
    if (m) {
      const [, type, code] = m
      return {
        provider: "instagram",
        // キャプション無しの /embed/ は高さが安定し、縦型コンテナで投稿全体が
        // 切れずに収まる（captioned はキャプション長で高さが変動し見切れるため不採用）
        embedUrl: `https://www.instagram.com/${type}/${code}/embed/`,
        originalUrl: raw,
        portrait: true,
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
