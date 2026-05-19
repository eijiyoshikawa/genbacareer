/**
 * 同一企業の求人が一覧内で連続表示されるのを抑制するヘルパー。
 *
 * DB クエリは rankScore desc で並んでいるが、人気の高い企業が連投すると
 * 上位 10 件全てが同じ企業になり、結果としてユーザーの視点が偏ってしまう。
 *
 * このユーティリティは:
 *   - 元の並び順 (= rankScore 順) は基本的に維持する
 *   - 「同一企業が直前 N 件に出ていたら」次の候補に席を譲る
 *   - 全候補を 1 回ずつ走査し、最後に残りを末尾に追加する
 *
 * 計算量 O(n)、安定 (元の rank 順を概ね保つ)。
 *
 * @param jobs    rankScore desc などで並んだ求人リスト
 * @param window  同一企業を再登場させない直前 N 件 (default: 2)
 * @returns       同一企業が連続しないよう再配置されたリスト
 */
export function diversifyByCompany<T extends { companyId: string | null }>(
  jobs: T[],
  window = 2
): T[] {
  if (jobs.length <= window + 1) return jobs

  const result: T[] = []
  const deferred: T[] = []
  // 直近に追加した companyId のリングバッファ
  const recent: Array<string | null> = []

  const recentlySeen = (id: string | null): boolean =>
    id !== null && recent.includes(id)

  const pushResult = (job: T) => {
    result.push(job)
    recent.push(job.companyId)
    if (recent.length > window) recent.shift()
  }

  for (const job of jobs) {
    if (recentlySeen(job.companyId)) {
      deferred.push(job)
    } else {
      pushResult(job)
      // deferred から拾えるものがあれば早めに復帰
      for (let i = 0; i < deferred.length; i++) {
        const d = deferred[i]
        if (!recentlySeen(d.companyId)) {
          deferred.splice(i, 1)
          pushResult(d)
          break
        }
      }
    }
  }

  // 残った defer はそのまま末尾へ
  return [...result, ...deferred]
}
