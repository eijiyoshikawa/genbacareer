import { getJobsApiConfig, type JobsApiConfig } from "./config"
import { HwApiError } from "./errors"
import type { HwApiErrorBody } from "./types"

export interface JobsApiRequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
  /** Next.js fetch revalidate seconds. 既定値は呼び出し側 endpoints で指定。 */
  revalidate?: number | false
  /** Edge fetch cache directive. revalidate と排他的。 */
  cache?: RequestCache
}

const USER_AGENT = "let-kyujin-media-site/1.0 (+jobs-api-proxy)"

/**
 * connector API への GET リクエストラッパー。
 * - APIキーを X-API-Key ヘッダで付与
 * - タイムアウトは AbortController で実装
 * - 4xx/5xx は HwApiError として throw（プロキシ層で透過転送）
 */
export async function jobsApiGet<T>(
  path: string,
  options: JobsApiRequestOptions = {},
  config: JobsApiConfig = getJobsApiConfig(),
): Promise<T> {
  const url = buildUrl(config.baseUrl, path, options.query)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), config.timeoutMs)
  const signal = mergeSignals(options.signal, controller.signal)

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": config.apiKey,
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal,
      ...buildCacheOption(options),
    })

    if (!response.ok) {
      throw await toHwApiError(response)
    }

    return (await response.json()) as T
  } catch (err) {
    if (err instanceof HwApiError) throw err
    if (isAbortError(err)) {
      throw new HwApiError(
        504,
        "UPSTREAM_TIMEOUT",
        `Jobs API request timed out after ${config.timeoutMs}ms`,
      )
    }
    throw new HwApiError(
      502,
      "UPSTREAM_UNAVAILABLE",
      err instanceof Error ? err.message : "Jobs API request failed",
    )
  } finally {
    clearTimeout(timer)
  }
}

function buildUrl(
  baseUrl: string,
  path: string,
  query: JobsApiRequestOptions["query"],
): string {
  const url = new URL(baseUrl + (path.startsWith("/") ? path : `/${path}`))
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

function buildCacheOption(options: JobsApiRequestOptions): RequestInit {
  if (options.cache) return { cache: options.cache }
  if (options.revalidate !== undefined) {
    return { next: { revalidate: options.revalidate } } as RequestInit
  }
  return {}
}

async function toHwApiError(response: Response): Promise<HwApiError> {
  let body: Partial<HwApiErrorBody> | null = null
  try {
    body = (await response.json()) as Partial<HwApiErrorBody>
  } catch {
    // ignore JSON parse error; fall back to status text
  }
  const error = body?.error
  return new HwApiError(
    response.status,
    error?.code ?? "UPSTREAM_ERROR",
    error?.message ?? response.statusText ?? "Jobs API error",
    error?.details,
  )
}

function mergeSignals(
  external: AbortSignal | undefined,
  internal: AbortSignal,
): AbortSignal {
  if (!external) return internal
  if (external.aborted) {
    return external
  }
  const controller = new AbortController()
  const onAbort = (signal: AbortSignal) => () =>
    controller.abort(signal.reason)
  external.addEventListener("abort", onAbort(external), { once: true })
  internal.addEventListener("abort", onAbort(internal), { once: true })
  return controller.signal
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError"
}
