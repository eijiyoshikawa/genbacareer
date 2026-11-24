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
/** 1 インスタンス内で同時に走らせるキャッシュミス (= 重いクエリ) の上限。 */
const MAX_CONCURRENT_MISSES = 3

/**
 * 実行枠が空くのを待つ上限。枠を持っているクエリが接続待ちで固まると
 * (pooler の払い出し待ちは 1 本あたり最長 60 秒)、後ろに並んだリクエストは
 * 関数の実行上限 (300 秒) まで黙って待ち続け、その間ずっとインスタンスの
 * 同時実行枠を占有していた (本番で /jobs/[id] の "Task timed out after 300 seconds")。
 * 待ちきれなければエラーにして、その場でエラーページを返す。
 */
const MAX_QUEUE_WAIT_MS = 15_000

export class CachedQueryBusyError extends Error {
  constructor() {
    super("cachedQuery: timed out waiting for a free slot (database is busy)")
    this.name = "CachedQueryBusyError"
  }
}

let running = 0
const waiters: Array<() => void> = []

function waitForSlot(): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const grant = () => {
      clearTimeout(timer)
      resolve()
    }
    const timer = setTimeout(() => {
      const i = waiters.indexOf(grant)
      // まだ並んでいる (= 枠を渡されていない) 場合だけ列から抜けて諦める
      if (i >= 0) {
        waiters.splice(i, 1)
        reject(new CachedQueryBusyError())
      }
    }, MAX_QUEUE_WAIT_MS)
    waiters.push(grant)
  })
}

async function withMissLimit<T>(fn: () => Promise<T>): Promise<T> {
  if (running >= MAX_CONCURRENT_MISSES) {
    await waitForSlot()
  } else {
    running++
  }
  try {
    return await fn()
  } finally {
    const next = waiters.shift()
    // 枠を次の待機者へそのまま渡す (running は減らさない)
    if (next) next()
    else running--
  }
}

/** 同じキーで実行中のクエリ。同時に来た同一リクエストは 1 回の実行を共有する。 */
const inflight = new Map<string, Promise<unknown>>()

/**
 * 条件の異なる検索が一斉に来ると、キャッシュはすべてミスして重いクエリが
 * 並列に走り、Prisma の接続 (1 インスタンス 10 本) と pooler を使い切って
 * サイト全体が 500 になる (2026-11-22, 11-23 に本番で発生)。
 * ミス時の実行は同一キーを 1 回にまとめ、同時実行数も絞って、
 * 求人詳細や記事など他のページが使う接続を残す。
 */
export async function cachedQuery<T>(
  keyParts: string[],
  revalidateSeconds: number,
  fn: () => Promise<T>
): Promise<T> {
  const key = JSON.stringify(keyParts)
  const existing = inflight.get(key)
  if (existing) return existing as Promise<T>
  const promise = cachedQueryInner(keyParts, revalidateSeconds, () =>
    withMissLimit(fn)
  ).finally(() => {
    inflight.delete(key)
  })
  inflight.set(key, promise)
  return promise
}

async function cachedQueryInner<T>(

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
