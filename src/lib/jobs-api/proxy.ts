/**
 * Route Handler 共通プロキシ層。
 *
 * - jobs-api 関数を呼び出して結果を NextResponse.json で返す
 * - HwApiError は status / code / message をそのまま転送（HANDOVER §6 準拠）
 * - JobsApiConfigError は 500 INTERNAL_ERROR
 * - 想定外例外はログに残して 500
 * - Cache-Control: s-maxage / stale-while-revalidate を付与
 */

import { NextResponse } from "next/server"
import { JobsApiConfigError } from "./config"
import { isHwApiError } from "./errors"
import type { HwApiErrorBody } from "./types"

export interface ProxyCacheOptions {
  sMaxAge?: number
  swr?: number
}

export interface ProxyResponseInit {
  cache?: ProxyCacheOptions
}

export async function runProxy<T>(
  fetcher: () => Promise<T>,
  init: ProxyResponseInit = {},
): Promise<NextResponse> {
  try {
    const data = await fetcher()
    const response = NextResponse.json(data)
    applyCacheHeader(response, init.cache)
    return response
  } catch (err) {
    return toErrorResponse(err)
  }
}

export function badRequest(
  code: string,
  message: string,
  details?: unknown,
): NextResponse {
  return errorResponse(400, code, message, details)
}

function toErrorResponse(err: unknown): NextResponse {
  if (isHwApiError(err)) {
    return NextResponse.json(err.toBody(), { status: err.status })
  }
  if (err instanceof JobsApiConfigError) {
    return errorResponse(
      500,
      "JOBS_API_NOT_CONFIGURED",
      err.message,
    )
  }
  const message =
    err instanceof Error ? err.message : "Unexpected error in jobs-api proxy"
  console.error("[hw-jobs-proxy] unexpected error", err)
  return errorResponse(500, "INTERNAL_ERROR", message)
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
): NextResponse {
  const body: HwApiErrorBody = {
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  }
  return NextResponse.json(body, { status })
}

function applyCacheHeader(
  response: NextResponse,
  cache: ProxyCacheOptions | undefined,
): void {
  if (!cache) return
  const sMaxAge = cache.sMaxAge ?? 300
  const swr = cache.swr ?? sMaxAge * 2
  response.headers.set(
    "Cache-Control",
    `public, s-maxage=${sMaxAge}, stale-while-revalidate=${swr}`,
  )
}
