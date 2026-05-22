/**
 * HelloWork API /kyujin/{dataId}/1 レスポンスから
 * タグ名の一覧と統計を出力するデバッグスクリプト
 *
 * 使い方:
 *   pnpm tsx --env-file=.env.local scripts/dump-hellowork-tags.ts
 *
 * 値は出力せず、タグ名・出現回数・サンプル値長のみ表示するので
 * 個人情報・求人本文の漏洩リスクはありません。
 */

const BASE =
  process.env.HELLOWORK_API_BASE ??
  "https://teikyo.hellowork.mhlw.go.jp/teikyo/api/2.0"

async function postForm(url: string, params: Record<string, string>) {
  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) body.append(k, v)
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })
  return { status: res.status, body: await res.text() }
}

function tryExtractToken(xml: string): string | null {
  const m = xml.match(/<token>([^<]+)<\/token>/i)
  return m ? m[1].trim() : null
}

function tryExtractFirstDataId(xml: string): string | null {
  const m = xml.match(/<data_id>([^<]+)<\/data_id>/i)
  return m ? m[1].trim() : null
}

interface TagStat {
  count: number
  maxLen: number
  hasNonEmpty: boolean
}

function collectTagStats(xml: string): Map<string, TagStat> {
  const stats = new Map<string, TagStat>()
  // 単純な <tag>value</tag> 形式のみ対象（自己終了タグは除外）
  const re = /<([a-zA-Z][a-zA-Z0-9_]*)>([^<]*)<\/\1>/g
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const tag = m[1]
    const value = m[2].trim()
    const cur = stats.get(tag) ?? { count: 0, maxLen: 0, hasNonEmpty: false }
    cur.count++
    if (value.length > cur.maxLen) cur.maxLen = value.length
    if (value.length > 0) cur.hasNonEmpty = true
    stats.set(tag, cur)
  }
  return stats
}

function countRecords(xml: string): number {
  // 各 <data> ブロック内に必ず <kjno> が1つあるはずなので kjno でカウント
  const m = xml.match(/<kjno>/g)
  return m?.length ?? 0
}

async function main() {
  const id = process.env.HELLOWORK_API_USER
  const pass = process.env.HELLOWORK_API_PASS
  if (!id || !pass) {
    console.error("ERROR: HELLOWORK_API_USER / HELLOWORK_API_PASS 未設定")
    process.exit(1)
  }

  console.log("[1] getToken")
  const r1 = await postForm(`${BASE}/auth/getToken`, { id, pass })
  const token = tryExtractToken(r1.body)
  if (!token) {
    console.error("getToken 失敗:", r1.body)
    process.exit(1)
  }
  console.log(`  ✓ token length=${token.length}`)

  try {
    console.log("[2] /kyujin (dataId list)")
    const r2 = await postForm(`${BASE}/kyujin`, { token })
    const dataId = tryExtractFirstDataId(r2.body)
    if (!dataId) {
      console.error("dataId 抽出失敗")
      return
    }
    console.log(`  ✓ first dataId=${dataId}`)

    console.log(`[3] /kyujin/${dataId}/1`)
    const r3 = await postForm(
      `${BASE}/kyujin/${encodeURIComponent(dataId)}/1`,
      { token }
    )
    console.log(`  ✓ HTTP ${r3.status}, body ${r3.body.length} bytes`)

    const records = countRecords(r3.body)
    console.log(`\n  推定レコード数（<kjno> 出現回数）: ${records}`)

    const stats = collectTagStats(r3.body)
    console.log(`  ユニークタグ数: ${stats.size}`)

    // タグ統計を整列して表示（出現回数の多い順）
    const entries = Array.from(stats.entries())
      .sort((a, b) => b[1].count - a[1].count)

    console.log("\n========== タグ統計 ==========")
    console.log("tag                                count   maxLen  hasValue")
    console.log("-----------------------------------------------------------")
    for (const [tag, s] of entries) {
      const padTag = tag.padEnd(36)
      const padCount = String(s.count).padStart(5)
      const padLen = String(s.maxLen).padStart(7)
      console.log(
        `${padTag} ${padCount}   ${padLen}   ${s.hasNonEmpty ? "yes" : "no"}`
      )
    }
  } finally {
    console.log("\n[4] delToken")
    const r4 = await postForm(`${BASE}/auth/delToken`, { token })
    console.log(`  ✓ HTTP ${r4.status}`)
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e)
  process.exit(1)
})
export {}
