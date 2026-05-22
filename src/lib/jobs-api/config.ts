/**
 * HelloWork connector API 設定。サーバ実行時のみ参照する想定。
 */

export interface JobsApiConfig {
  baseUrl: string
  apiKey: string
  timeoutMs: number
}

export class JobsApiConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "JobsApiConfigError"
  }
}

export function getJobsApiConfig(): JobsApiConfig {
  const baseUrl = process.env.JOBS_API_BASE_URL
  const apiKey = process.env.JOBS_API_KEY

  if (!baseUrl) {
    throw new JobsApiConfigError("JOBS_API_BASE_URL is not set")
  }
  if (!apiKey) {
    throw new JobsApiConfigError("JOBS_API_KEY is not set")
  }

  return {
    baseUrl: baseUrl.replace(/\/+$/, ""),
    apiKey,
    timeoutMs: parseTimeout(process.env.JOBS_API_TIMEOUT_MS) ?? 8_000,
  }
}

function parseTimeout(value: string | undefined): number | null {
  if (!value) return null
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}
