import type { HwApiErrorBody } from "./types"

/**
 * connector API から返ったエラーをラップする例外。
 * status / code / details を保持し、プロキシで透過転送できるようにする。
 */
export class HwApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details: unknown

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = "HwApiError"
    this.status = status
    this.code = code
    this.details = details
  }

  toBody(): HwApiErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    }
  }
}

export function isHwApiError(value: unknown): value is HwApiError {
  return value instanceof HwApiError
}
