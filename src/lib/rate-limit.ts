/**
 * 軽量 API レート制限ユーティリティ
 *
 * シングルプロセス前提の固定窓（fixed-window）方式。
 * Vercel Serverless Functions は呼び出しごとに別インスタンスになり得るため、
 * 各インスタンスごとにカウンタが分かれる前提（=実効レートはインスタンス数倍）。
 * 本格的な分散レート制限が必要な場合は Upstash Redis 等への置き換えを検討。
 *
 * それでも 1 IP からの dictionary attack や spam submission を一定抑止する効果はある。
 *
 * @example
 *   const rl = checkRateLimit({ key: `register:${ip}`, limit: 5, windowMs: 15 * 60_000 })
 *   if (!rl.allowed) return rateLimitResponse(rl)
 */

interface Bucket {
  count: number
  /** Unix epoch ms — 窓のリセット時刻 */
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export interface RateLimitOptions {
  /** バケットを識別するキー（"register:1.2.3.4" など） */
  key: string
  /** 窓内で許容するリクエスト数 */
  limit: number
  /** 窓の長さ（ミリ秒） */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  /** 残り許容リクエスト数（0 を下回らない） */
  remaining: number
  /** 窓のリセット時刻（Unix epoch ms） */
  resetAt: number
  /** 設定値 */
  limit: number
  /** 次のリトライまでの秒数（allowed=false のときのみ意味あり） */
  retryAfterSec: number
}

/**
 * 指定キーのバケットを 1 つ消費する。
 * 残量があれば allowed=true、なければ allowed=false を返す。
 */
export function checkRateLimit(opts: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const existing = buckets.get(opts.key)

  if (!existing || existing.resetAt <= now) {
    // 新しい窓を開始
    const resetAt = now + opts.windowMs
    buckets.set(opts.key, { count: 1, resetAt })
    return {
      allowed: true,
      remaining: opts.limit - 1,
      resetAt,
      limit: opts.limit,
      retryAfterSec: 0,
    }
  }

  if (existing.count >= opts.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
      limit: opts.limit,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count++
  return {
    allowed: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
    limit: opts.limit,
    retryAfterSec: 0,
  }
}

/**
 * ヘッダから client IP を抽出する（Request / next/headers() の両方に対応する
 * ダックタイピングの型を受け取る）。
 *
 * `x-forwarded-for` の先頭エントリはクライアントが自由に偽装できる
 * （偽装した値を送ればレート制限のキーを毎回変えて回避できてしまう）。
 * Vercel エッジが観測した実際の接続元 IP は `x-real-ip`、または
 * `x-forwarded-for` の末尾（Vercel が追記する）にあるため、そちらを使う。
 */
export function extractClientIpFromHeaders(headers: {
  get(name: string): string | null
}): string | null {
  const real = headers.get("x-real-ip")
  if (real?.trim()) return real.trim()
  const xff = headers.get("x-forwarded-for")
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean)
    const last = parts[parts.length - 1]
    if (last) return last
  }
  return null
}

/** リクエストから client IP を抽出する。不明な場合は "unknown"。 */
export function getClientIp(request: Request): string {
  return extractClientIpFromHeaders(request.headers) ?? "unknown"
}

/**
 * 429 レスポンスを生成する。
 */
export function rateLimitResponse(
  result: RateLimitResult,
  message = "リクエストが多すぎます。しばらく時間を置いてから再度お試しください。"
): Response {
  return Response.json(
    {
      error: message,
      retryAfter: result.retryAfterSec,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
      },
    }
  )
}

/**
 * 古いバケットを掃除するヘルパー。
 * 必要に応じてクーロン等で呼ぶ想定（メモリリーク予防）。
 * 通常運用では使い古したバケットも次回ヒット時に上書きされるため必須ではない。
 */
export function pruneExpiredBuckets(): number {
  const now = Date.now()
  let removed = 0
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
      removed++
    }
  }
  return removed
}
