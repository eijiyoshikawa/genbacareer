import { JobsApiConfigError } from "./config"
import { HwApiError, isHwApiError } from "./errors"

export type SafeFetchResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: "not-configured" | "not-found" | "upstream-error"; status?: number; message: string }

/**
 * 連携APIエラーを Server Component 内で UI 用に正規化するラッパー。
 * - JobsApiConfigError: env 未設定 → "not-configured"
 * - HwApiError 404: notFound() に流す用途で "not-found"
 * - その他: "upstream-error"
 */
export async function safeFetch<T>(loader: () => Promise<T>): Promise<SafeFetchResult<T>> {
  try {
    const data = await loader()
    return { ok: true, data }
  } catch (err) {
    if (err instanceof JobsApiConfigError) {
      return { ok: false, reason: "not-configured", message: err.message }
    }
    if (isHwApiError(err)) {
      if (err.status === 404) {
        return { ok: false, reason: "not-found", status: 404, message: err.message }
      }
      return { ok: false, reason: "upstream-error", status: err.status, message: err.message }
    }
    return {
      ok: false,
      reason: "upstream-error",
      message: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

export function isHwApiNotFound(err: unknown): boolean {
  return err instanceof HwApiError && err.status === 404
}
