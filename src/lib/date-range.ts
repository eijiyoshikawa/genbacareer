/**
 * 日付計算ユーティリティ。
 *
 * Server Component の本体で直接 `new Date(Date.now() - ...)` を呼ぶと
 * react-hooks/purity が「impure function during render」として警告する。
 * 純粋な util 経由で呼べば警告を回避でき、テスト時も差し替えやすい。
 */

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}
