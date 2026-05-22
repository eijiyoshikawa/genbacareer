/**
 * HelloWork API の生レスポンスを表示するデバッグスクリプト
 *
 * 使い方:
 *   pnpm tsx --env-file=.env.local scripts/dump-hellowork-raw.ts
 *
 * 実行内容（生 XML をそのまま標準出力に表示）:
 *   1. POST /auth/getToken
 *   2. POST /kyujin（データ ID リスト取得）
 *   3. （データ ID が取れた場合）POST /kyujin/{先頭ID}/1（最初のページ取得）
 *   4. POST /auth/delToken
 *
 * トークン文字列・求人本文（会社名等）が混入する可能性があるので、
 * チャットに貼る際は必要に応じてマスクしてください。
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
  const text = await res.text()
  return { status: res.status, statusText: res.statusText, body: text }
}

function dump(label: string, r: { status: number; statusText: string; body: string }) {
  console.log(`\n========== ${label} ==========`)
  console.log(`HTTP ${r.status} ${r.statusText}`)
  console.log(`(body length: ${r.body.length} bytes)`)
  console.log("--- body ---")
  console.log(r.body)
  console.log("--- end ---")
}

function tryExtractToken(xml: string): string | null {
  const m = xml.match(/<token>([^<]+)<\/token>/i)
  return m ? m[1].trim() : null
}

function tryExtractDataIds(xml: string): string[] {
  const ids: string[] = []
  const re = /<(?:data_id|dataId|id)>([^<]+)<\/(?:data_id|dataId|id)>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(xml)) !== null) {
    const v = m[1].trim()
    if (v) ids.push(v)
  }
  return ids
}

async function main() {
  const id = process.env.HELLOWORK_API_USER
  const pass = process.env.HELLOWORK_API_PASS
  if (!id || !pass) {
    console.error("ERROR: HELLOWORK_API_USER / HELLOWORK_API_PASS 未設定")
    process.exit(1)
  }

  // Step 1: getToken
  const r1 = await postForm(`${BASE}/auth/getToken`, { id, pass })
  dump("1) getToken", r1)
  const token = tryExtractToken(r1.body)
  if (!token) {
    console.error("\nトークンが抽出できません。終了。")
    process.exit(1)
  }
  console.log(`\n(extracted token length: ${token.length})`)

  let dataIds: string[] = []
  try {
    // Step 2: /kyujin
    const r2 = await postForm(`${BASE}/kyujin`, { token })
    dump("2) /kyujin (dataId list)", r2)
    dataIds = tryExtractDataIds(r2.body)
    console.log(`\n(extracted dataIds count: ${dataIds.length})`)

    // Step 3: /kyujin/{先頭ID}/1
    if (dataIds.length > 0) {
      const r3 = await postForm(
        `${BASE}/kyujin/${encodeURIComponent(dataIds[0])}/1`,
        { token }
      )
      // 求人本文は長い可能性があるので先頭 3000 文字だけ表示
      const truncated = {
        ...r3,
        body:
          r3.body.length > 3000
            ? r3.body.slice(0, 3000) +
              `\n... [truncated. total ${r3.body.length} bytes]`
            : r3.body,
      }
      dump(`3) /kyujin/${dataIds[0]}/1 (head 3000 bytes)`, truncated)
    }
  } finally {
    // Step 4: delToken
    const r4 = await postForm(`${BASE}/auth/delToken`, { token })
    dump("4) /auth/delToken", r4)
  }
}

main().catch((e) => {
  console.error("Unhandled error:", e)
  process.exit(1)
})
export {}
