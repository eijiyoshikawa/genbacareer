/**
 * 匿名ユーザー追跡用の session ID Cookie 読み取り。
 *
 * Cookie 名: `gc_sid` (genbacareer session id)
 * 発行は middleware.ts が担当。Server Component / Route Handler では
 * 読み取りのみ行う（Server Component から Cookie をセットできないため）。
 */

import { cookies } from "next/headers"

export const SESSION_COOKIE_NAME = "gc_sid"

/**
 * Cookie に gc_sid があれば返す。無ければ null。
 * middleware が発行しているため、ほぼすべてのリクエストで存在する。
 */
export async function getSessionIdIfExists(): Promise<string | null> {
  const store = await cookies()
  const v = store.get(SESSION_COOKIE_NAME)?.value
  return v && /^[a-f0-9-]{36}$/i.test(v) ? v : null
}

/**
 * 既存があればそれ、無ければ null。
 * 旧名互換のため別名 export。
 */
export const getOrCreateSessionId = getSessionIdIfExists
