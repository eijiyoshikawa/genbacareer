/**
 * Promise を一定時間内に解決させるユーティリティ。
 *
 * 用途: ビルド時 / SSR 時の DB クエリで Supabase 側の statement_timeout
 *      (60s) より短いデッドラインを切り、ビルドワーカー (60s) が落ちる前に
 *      フォールバック値で先へ進めるようにする。
 *
 * Promise.race を使い、本体 Promise が遅れたら fallback を解決する。
 * 本体が遅れた場合のリーク（後から resolve/reject される）は GC 任せ。
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  fallback: T,
  label?: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      if (label) console.warn(`[withTimeout] ${label} > ${ms}ms, using fallback`)
      resolve(fallback)
    }, ms)
  })
  try {
    const result = await Promise.race([promise, timeoutPromise])
    return result
  } finally {
    if (timer) clearTimeout(timer)
  }
}
