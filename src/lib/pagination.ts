// ページネーション用の `page` クエリパラメータを安全に整数化する。
// `Number("abc")` 等の非数値入力は NaN になり、`skip: (page - 1) * PER_PAGE`
// が NaN のまま Prisma に渡ると PrismaClientValidationError で 500 になる
// (2026-07-31 定期バグ検査: /journal で category との組み合わせ fuzzing により発生を確認)。
// 常に 1 以上の有限整数を返す。
export function parsePage(value: string | undefined): number {
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 1
}
