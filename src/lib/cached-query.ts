import { unstable_cache } from "next/cache"

/**
 * 重い読み取りクエリの結果を Next.js の Data Cache に短時間だけ載せるヘルパー。
 *
 * 用途: 未ログイン (ゲスト) 向けの「誰が見ても同じ結果」になるクエリ。
 * 同じ内容のリクエストが短時間に集中しても DB へは 1 回しか行かないようにして、
 * Supabase pooler の接続枯渇 (ECHECKOUTTIMEOUT / P2024) でサイト全体が
 * 巻き添えになるのを防ぐ。
 *
 * 注意:
 *  - 結果は JSON 化されて保存される。Date は文字列になって返るので、
 *    呼び出し側は Date を文字列としても扱える形にしておくこと。
 *  - ユーザーごとに結果が変わるクエリには使わないこと (キーに含めない限り共有される)。
 *  - クエリが throw した場合はキャッシュされない (次のリクエストで再試行される)。
 *
 * Next.js のリクエスト外 (vitest / スクリプト) では unstable_cache が使えないため、
 * その場合はキャッシュ無しでそのまま実行する。
 */
export async function cachedQuery<T>(
  keyParts: string[],
  revalidateSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  let invoked = false
  const run = () => {
    invoked = true
    return fn()
  }
  try {
    return await unstable_cache(run, keyParts, {
      revalidate: revalidateSeconds,
    })()
  } catch (error) {
    // fn 自体の失敗はそのまま伝える。fn に到達する前の失敗
    // (Data Cache が無い実行環境) だけ、キャッシュ無しで実行する。
    if (invoked) throw error
    return fn()
  }
}
