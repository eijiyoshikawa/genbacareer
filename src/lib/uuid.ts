/**
 * 受け取った文字列が UUID v4 形式かどうかを返す。
 *
 * `/jobs/[id]` `/companies/[id]` などの動的ルートで、外部スクレイパー
 * や誤入力（メールアドレス等）が混入したときに Prisma が `P2023`
 * （不正な UUID）で 500 を返すのを防ぐ。先に弾いて 404 を返す。
 */
export function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}
