/**
 * シンプルなインメモリ・トークンバケット型レートリミッター。
 *
 * プロセス単位なので水平スケール時には Upstash Redis 等への移行が必要。
 * 当面のスパム抑止用途として最低限の防御を提供する。
 */

type Bucket = {
  count: number
  resetAt: number
}

const store = new Map<string, Bucket>()

let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}

export type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

/**
 * @param key 識別子（IP・email など）。空文字は許可しない。
 * @param limit ウィンドウ内最大ヒット数
 * @param windowMs ウィンドウ長（ミリ秒）
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  if (!key) return { ok: false, remaining: 0, retryAfterMs: windowMs }

  const now = Date.now()
  sweep(now)

  const existing = store.get(key)
  if (!existing || existing.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true, remaining: limit - 1, retryAfterMs: 0 }
  }

  if (existing.count >= limit) {
    return { ok: false, remaining: 0, retryAfterMs: existing.resetAt - now }
  }

  existing.count += 1
  return {
    ok: true,
    remaining: limit - existing.count,
    retryAfterMs: existing.resetAt - now,
  }
}

/** リクエスト元 IP を best-effort で取得 */
export function getClientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  const real = request.headers.get("x-real-ip")
  if (real) return real
  return "anonymous"
}

/** 共通レスポンス: 429 */
export function rateLimitResponse(retryAfterMs: number) {
  const seconds = Math.ceil(retryAfterMs / 1000)
  return Response.json(
    {
      error:
        "アクセスが集中しています。しばらく時間をおいて再度お試しください。",
    },
    {
      status: 429,
      headers: { "Retry-After": String(seconds) },
    }
  )
}
