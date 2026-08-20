// ページング用クエリの安全なパース。
//
// `Math.max(1, Number(raw))` は NaN をそのまま通す (Math.max(1, NaN) === NaN)。
// "1e999" は Infinity になる。いずれも Prisma の skip/take に渡ると
// PrismaClientValidationError となり、`?page=abc` だけでページが 500 になる。
// 有限の整数へ丸めて範囲内に収める。

const MAX_PAGE = 10_000

export function parsePageParam(raw: string | null | undefined): number {
  const n = Number(raw)
  if (Number.isNaN(n) || n < 1) return 1
  // n >= MAX_PAGE を先に見て Infinity をここで吸収する
  // (Math.floor(Infinity) は Infinity のままなので後段では潰せない)
  if (n >= MAX_PAGE) return MAX_PAGE
  return Math.floor(n)
}

export function parseLimitParam(
  raw: string | null | undefined,
  fallback: number,
  max: number
): number {
  const n = Number(raw)
  if (Number.isNaN(n) || n < 1) return fallback
  if (n >= max) return max
  return Math.floor(n)
}
