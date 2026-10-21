/**
 * クエリ文字列の整数パラメータを安全にパースする。
 * NaN / 小数 / 範囲外は Prisma の skip/take で 500 になるため、必ず整数に丸めてクランプする。
 */
export function parseIntParam(
  raw: string | null | undefined,
  fallback: number,
  min: number,
  max: number = Number.MAX_SAFE_INTEGER,
): number {
  const n = Math.floor(Number(raw ?? ""))
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}
