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
    super("cachedQuery: timed out waiting for the database (busy)")
    this.name = "CachedQueryBusyError"
  }
}

/**
 * クエリ自体の待ち時間の上限。枠待ち (MAX_QUEUE_WAIT_MS) だけを区切っても、
 * 枠を持ったクエリが固まると同じキーの呼び出しは全員その 1 本の完了を
 * 待ち続ける (inflight 共有)。ゲスト閲覧可否の判定のように全ページが通る
 * キーで起きると、そのインスタンスの求人詳細がすべて関数の実行上限
 * (300 秒) まで応答しなくなる。上限を超えたら待つのをやめてエラーにし、
 * 枠も次へ渡す (DB 側のクエリは止められないが、待ちの連鎖は断てる)。
 * 正常時の最も重いクエリでも数秒なので、25 秒で打ち切って困るものは無い。
 */
const MAX_QUERY_MS = 25_000

function withDeadline<T>(promise: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new CachedQueryBusyError()), MAX_QUERY_MS)
  })
  // 打ち切り後に本体が失敗しても未処理の rejection にしない
  promise.catch(() => {})
  return Promise.race([promise, deadline]).finally(() => clearTimeout(timer))
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
    return await withDeadline(fn())
  } finally {
    const next = waiters.shift()
    // 枠を次の待機者へそのまま渡す (running は減らさない)
    if (next) next()
    else running--
  }
}

/**
 * 同じキーで実行中の「クエリ本体」。
 *
 * 下の inflight は unstable_cache の呼び出しをまとめるだけで、期限切れの
 * エントリには効かない。unstable_cache は期限切れの値をその場で返し、更新は
 * リクエストごとに裏で走らせるため、外側の Promise はすぐ解決して inflight から
 * 消える。その結果、全ページが通るキー (ゲスト閲覧可否・既定の求人一覧) が
 * 期限を迎えるたびに、更新が書き戻されるまでに来たリクエストの数だけ同じ重い
 * クエリが走り、ミス用の実行枠 (3 本) も埋めて他の検索を 500 にしていた。
 * クエリ本体の実行をキーごとに 1 本にまとめ、表の読み直しも裏の更新も共有する。
 */
const runningFns = new Map<string, Promise<unknown>>()

function runShared<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = runningFns.get(key)
  if (existing) return existing as Promise<T>
  const promise = withMissLimit(fn).finally(() => {
    runningFns.delete(key)
  })
  // 裏の更新として実行され、誰も待っていない場合でも未処理の rejection にしない
  promise.catch(() => {})
  runningFns.set(key, promise)
  return promise
}

/** 同じキーで実行中の呼び出し。同時に来た同一リクエストは 1 回の実行を共有する。 */
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
    runShared(key, fn)
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
