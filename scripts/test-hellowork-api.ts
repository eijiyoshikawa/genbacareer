/**
 * HelloWork 求人情報提供 API 疎通確認スクリプト
 *
 * 使い方:
 *   pnpm tsx --env-file=.env.local scripts/test-hellowork-api.ts
 *
 * 実行内容:
 *   1. getToken でトークン発行
 *   2. fetchKyujinIdList でデータ ID リスト取得
 *   3. 先頭 1 件だけ fetchKyujinByDataId(page=1) を実行
 *   4. delToken でトークン破棄
 *
 * 機微情報（ID/Pass/Token/求人本体）は出力しません。
 * 件数や成否のみログに出します。
 */

import {
  getToken,
  delToken,
  fetchKyujinIdList,
  fetchKyujinByDataId,
} from "../src/lib/crawler/hellowork"

async function main() {
  const id = process.env.HELLOWORK_API_USER
  const pass = process.env.HELLOWORK_API_PASS
  if (!id || !pass) {
    console.error(
      "ERROR: HELLOWORK_API_USER / HELLOWORK_API_PASS が読み込めません。" +
        "\n  pnpm tsx --env-file=.env.local scripts/test-hellowork-api.ts のように --env-file を渡してください。"
    )
    process.exit(1)
  }

  console.log("[1/4] getToken: トークン発行中…")
  let token: string
  try {
    token = await getToken({ id, pass })
    console.log(`  ✓ トークン発行成功 (length=${token.length})`)
  } catch (e) {
    console.error(`  ✗ getToken 失敗: ${e instanceof Error ? e.message : e}`)
    process.exit(1)
  }

  try {
    console.log("[2/4] fetchKyujinIdList: データ ID リスト取得中…")
    const dataIds = await fetchKyujinIdList(token)
    console.log(`  ✓ データ ID 取得成功: ${dataIds.length} 件`)

    if (dataIds.length === 0) {
      console.log("  ! データ ID が 0 件のためサンプル取得をスキップ")
    } else {
      console.log(
        `[3/4] fetchKyujinByDataId(先頭1件, page=1): 求人取得中…`
      )
      const jobs = await fetchKyujinByDataId(token, dataIds[0], 1)
      console.log(`  ✓ 求人取得成功: ${jobs.length} 件`)

      if (jobs.length > 0) {
        const sample = jobs[0]
        console.log(
          "  サンプル1件メタ情報:",
          JSON.stringify(
            {
              helloworkId: sample.helloworkId,
              prefecture: sample.prefecture,
              employmentType: sample.employmentType,
              salaryType: sample.salaryType,
              hasTitle: Boolean(sample.title && sample.title !== "不明"),
              hasCompanyName: Boolean(
                sample.companyName && sample.companyName !== "不明"
              ),
              hasDescription: Boolean(sample.description),
            },
            null,
            2
          )
        )
      }
    }
  } finally {
    console.log("[4/4] delToken: トークン破棄中…")
    try {
      await delToken(token)
      console.log("  ✓ トークン破棄成功")
    } catch (e) {
      console.error(
        `  ✗ delToken 失敗: ${e instanceof Error ? e.message : e}`
      )
    }
  }

  console.log("\n疎通確認 完了")
}

main().catch((e) => {
  console.error("Unhandled error:", e)
  process.exit(1)
})
export {}
