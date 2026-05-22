/**
 * Unsplash API クライアント（最小実装）。
 *
 * @see https://unsplash.com/documentation
 *
 * 環境変数:
 *   UNSPLASH_ACCESS_KEY — Unsplash Developer Console の Access Key
 *
 * Rate limit:
 *   - Demo mode: 50 req/h
 *   - Production approved: 5000 req/h
 *   建設業のプロフィール編集 UI 用途ではあまり叩かないので Demo で十分。
 *
 * Attribution:
 *   - 表示時に "Photo by {user.name} on Unsplash" 形式のクレジットが必要
 *   - 今回は URL のみ保存し、表示側で都度クレジット要請に応える設計
 */

const API_BASE = "https://api.unsplash.com"

function getAccessKey(): string {
  return process.env.UNSPLASH_ACCESS_KEY ?? ""
}

export function isUnsplashConfigured(): boolean {
  return getAccessKey().length > 0
}

export interface UnsplashPhoto {
  id: string
  description: string | null
  /** 編集中フォームに保存する URL（1080px サイズ程度の Regular URL） */
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  user: {
    name: string
    username: string
    profileUrl: string
  }
  /** Unsplash 上の写真ページ */
  htmlUrl: string
  width: number
  height: number
  color: string | null
}

export interface UnsplashSearchResult {
  total: number
  totalPages: number
  results: UnsplashPhoto[]
}

interface RawUnsplashUser {
  name: string
  username: string
  links?: { html?: string }
}

interface RawUnsplashPhoto {
  id: string
  description: string | null
  alt_description: string | null
  urls: { raw: string; full: string; regular: string; small: string; thumb: string }
  user: RawUnsplashUser
  links?: { html?: string }
  width: number
  height: number
  color: string | null
}

interface RawSearchResponse {
  total: number
  total_pages: number
  results: RawUnsplashPhoto[]
}

/**
 * キーワード検索。orientation を絞ると建設業の現場写真として使いやすい横長が取れる。
 */
export async function searchUnsplashPhotos(
  query: string,
  options: { perPage?: number; orientation?: "landscape" | "portrait" | "squarish" } = {}
): Promise<UnsplashSearchResult> {
  const key = getAccessKey()
  if (!key) {
    throw new Error("UNSPLASH_ACCESS_KEY not configured")
  }
  const trimmed = query.trim()
  if (!trimmed) {
    return { total: 0, totalPages: 0, results: [] }
  }

  const params = new URLSearchParams({
    query: trimmed,
    per_page: String(Math.min(30, Math.max(1, options.perPage ?? 18))),
    content_filter: "high",
  })
  if (options.orientation) {
    params.set("orientation", options.orientation)
  }

  const res = await fetch(`${API_BASE}/search/photos?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${key}`,
      "Accept-Version": "v1",
    },
    // Unsplash 検索結果は時間で変動するためキャッシュしない
    cache: "no-store",
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Unsplash API error: ${res.status} ${text.slice(0, 200)}`)
  }

  const json = (await res.json()) as RawSearchResponse
  return {
    total: json.total,
    totalPages: json.total_pages,
    results: json.results.map(normalizePhoto),
  }
}

function normalizePhoto(raw: RawUnsplashPhoto): UnsplashPhoto {
  return {
    id: raw.id,
    description: raw.description ?? raw.alt_description ?? null,
    urls: raw.urls,
    user: {
      name: raw.user.name,
      username: raw.user.username,
      profileUrl: raw.user.links?.html ?? `https://unsplash.com/@${raw.user.username}`,
    },
    htmlUrl: raw.links?.html ?? `https://unsplash.com/photos/${raw.id}`,
    width: raw.width,
    height: raw.height,
    color: raw.color,
  }
}
