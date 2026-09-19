const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * ADMIN_EMAIL/ADMIN_PASSWORD_HASH の admin-credentials ログインは DB に対応する
 * User 行を持たず、session.user.id が固定文字列 "admin" になる。
 * *_by / invited_by_id 等の actor 記録カラムは @db.Uuid のため、
 * そのまま書き込むと P2023 (invalid UUID) でクエリごと失敗する。
 * UUID 形式でない id は null にフォールバックする。
 */
export function toActorUuid(id: string | null | undefined): string | null {
  if (!id || !UUID_RE.test(id)) return null
  return id
}
