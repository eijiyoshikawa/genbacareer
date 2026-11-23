/**
 * scripts/line-richmenu-fix.mjs
 *
 * LINE 公式アカウント Manager (GUI) で作ったリッチメニューが表示されない問題を解消する。
 *
 * 背景:
 *   以前 Messaging API で「デフォルトリッチメニュー」を設定していると、それが
 *   GUI で公開したメニューより優先されて表示され続ける。API のデフォルトは
 *   GUI からは解除できず、API 経由でのみ解除できる。
 *
 * やること（破壊は最小・段階実行）:
 *   1. 登録済みリッチメニュー一覧を表示
 *   2. 現在の「デフォルトリッチメニュー」ID を表示
 *   3. API のデフォルト割り当てを解除（DELETE /v2/bot/user/all/richmenu）
 *   4. 旧セットアップスクリプトが作った "GenbaCareer Main Menu" のみ削除
 *
 * 実行方法（tsx 不要・標準 node だけで動く）:
 *   node scripts/line-richmenu-fix.mjs
 *
 * 必要な環境変数（.env.local / .env に記載があれば自動読込）:
 *   LINE_CHANNEL_ACCESS_TOKEN
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

function loadDotEnv() {
  for (const file of [".env.local", ".env"]) {
    const path = join(process.cwd(), file)
    if (!existsSync(path)) continue
    for (const rawLine of readFileSync(path, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith("#")) continue
      const eq = line.indexOf("=")
      if (eq < 0) continue
      const key = line.slice(0, eq).trim()
      let value = line.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) process.env[key] = value
    }
  }
}
loadDotEnv()

// トークンの優先順位: コマンド引数 > 環境変数 > .env(.local)
//   node scripts/line-richmenu-fix.mjs "＜チャネルアクセストークン＞"
const TOKEN = process.argv[2] || process.env.LINE_CHANNEL_ACCESS_TOKEN
if (!TOKEN) {
  console.error("✖ LINE のチャネルアクセストークンが見つかりません。")
  console.error("  次のいずれかで渡してください:")
  console.error('  1) 引数で直接:  node scripts/line-richmenu-fix.mjs "＜トークン＞"')
  console.error("  2) .env.local に LINE_CHANNEL_ACCESS_TOKEN=... を記載")
  process.exit(1)
}

const API = "https://api.line.me"
const H = { Authorization: `Bearer ${TOKEN}` }
const LEGACY_MENU_NAME = "GenbaCareer Main Menu"

async function main() {
  // 1) 一覧
  const listRes = await fetch(`${API}/v2/bot/richmenu/list`, { headers: H })
  if (!listRes.ok) {
    console.error(`✖ 一覧取得に失敗: ${listRes.status} ${await listRes.text().catch(() => "")}`)
    process.exit(1)
  }
  const { richmenus = [] } = await listRes.json().catch(() => ({ richmenus: [] }))
  console.log(`→ 登録済みリッチメニュー: ${richmenus.length} 件`)
  for (const m of richmenus) console.log(`  - ${m.richMenuId}  name="${m.name}"`)

  // 2) 現在のデフォルト
  let defaultId = null
  const defRes = await fetch(`${API}/v2/bot/user/all/richmenu`, { headers: H })
  if (defRes.ok) {
    const j = await defRes.json().catch(() => ({}))
    defaultId = j.richMenuId ?? null
  }
  console.log(`→ 現在のデフォルト: ${defaultId ?? "（未設定）"}`)

  // 3) デフォルト解除（本命）
  if (defaultId) {
    const del = await fetch(`${API}/v2/bot/user/all/richmenu`, { method: "DELETE", headers: H })
    console.log(del.ok ? "→ APIデフォルト解除: ✓" : `→ APIデフォルト解除: ✖ ${del.status}`)
  } else {
    console.log("→ APIデフォルトは未設定のため解除不要")
  }

  // 4) 旧APIメニューのみ削除
  const legacy = richmenus.filter((m) => m.name === LEGACY_MENU_NAME)
  if (legacy.length > 0) {
    console.log(`→ 旧APIメニュー "${LEGACY_MENU_NAME}" を削除（${legacy.length}件）…`)
    for (const m of legacy) {
      const d = await fetch(`${API}/v2/bot/richmenu/${encodeURIComponent(m.richMenuId)}`, {
        method: "DELETE",
        headers: H,
      })
      console.log(`  ${d.ok ? "✓" : "✖"} ${m.richMenuId}`)
    }
  } else {
    console.log(`→ 旧APIメニュー "${LEGACY_MENU_NAME}" は無し（削除不要）`)
  }

  console.log("")
  console.log("🎉 完了。LINE トークを開き直す（or ブロック→解除）と、")
  console.log("   管理画面で公開したメニューが表示されます。")
  console.log("   まだ出ない場合は、管理画面でメニューが『公開/表示中』かつ")
  console.log("   表示期間の開始日時が現在以前かを確認してください。")
}

main().catch((e) => {
  console.error("✖ エラー:", e)
  process.exit(1)
})
