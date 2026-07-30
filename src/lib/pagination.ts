/**
 * クエリパラメータの page/limit 値を安全な正の整数に変換する。
 *
 * `Math.max(1, Number(value ?? "1"))` は一見安全に見えるが、value が
 * 数値に変換できない文字列（不正な入力やスキャナーの fuzzing）の場合
 * `Number(value)` が NaN になり、`Math.max(1, NaN)` も NaN のままになる
 * 落とし穴がある。NaN な page/limit を Prisma の skip/take に渡すと
 * 「Argument `skip` is missing」のような 500 エラーで落ちるため、
 * 必ずこの関数を経由して不正値を fallback に丸める。
 */
export function parsePositiveInt(
  value: string | undefined | null,
  fallback: number
): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : fallback
}
