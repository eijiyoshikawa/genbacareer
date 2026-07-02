/**
 * scripts/line-richmenu-fix.ts
 *
 * LINE 公式アカウント Manager (GUI) で作ったリッチメニューが表示されない問題を解消する。
 *
 * 背景:
 *   以前 `setup-line-rich-menu.ts` が Messaging API で「デフォルトリッチメニュー」を
 *   設定していると、それが GUI で公開したメニューより優先されて表示され続ける。
 *   API のデフォルトは GUI からは解除できず、API 経由でのみ解除できる。
 *
 * このスクリプトは（破壊的操作は最小・確認しやすいよう段階実行）:
 *   1. 現在登録されているリッチメニュー一覧を表示
 *   2. 現在の「デフォルトリッチメニュー」ID を表示
 *   3. API のデフォルト割り当てを解除（DELETE /v2/bot/user/all/richmenu）
 *   4. 旧セットアップスクリプトが作った "GenbaCareer Main Menu" のみ削除
 *      （GUI で作ったメニューは名前が異なるため消えない）
 *
 * 実行方法:
 *   pnpm tsx scripts/line-richmenu-fix.ts
 *
 * 必要な環境変数（.env.local / .env）:
 *   LINE_CHANNEL_ACCESS_TOKEN
 *
 * 実行後、LINE トークを開き直す（or 一度ブロック→解除）と GUI のメニューが表示される。
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

function loadDotEnv(): void {
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

import {
  isMessagingConfigured,
  listRichMenus,
  getDefaultRichMenuId,
  cancelDefaultRichMenu,
  deleteRichMenu,
} from "../src/lib/line-messaging"

// 旧セットアップスクリプトが作ったメニュー名（これだけ削除対象にする）
const LEGACY_MENU_NAME = "GenbaCareer Main Menu"

async function main() {
  if (!isMessagingConfigured()) {
    console.error("✖ LINE_CHANNEL_ACCESS_TOKEN が未設定です（.env.local / .env を確認）")
    process.exit(1)
  }

  console.log("→ 登録済みリッチメニュー一覧:")
  const menus = await listRichMenus()
  if (menus.length === 0) {
    console.log("  （API 経由のリッチメニューは 0 件）")
  } else {
    for (const m of menus) {
      console.log(`  - ${m.richMenuId}  name="${m.name}"`)
    }
  }

  const defaultId = await getDefaultRichMenuId()
  console.log(`→ 現在のデフォルトリッチメニュー: ${defaultId ?? "（未設定）"}`)

  if (defaultId) {
    console.log("→ API のデフォルト割り当てを解除します…")
    const ok = await cancelDefaultRichMenu()
    console.log(ok ? "  ✓ 解除しました" : "  ✖ 解除に失敗（トークン権限を確認）")
  } else {
    console.log("→ API デフォルトは未設定のため解除不要")
  }

  const legacy = menus.filter((m) => m.name === LEGACY_MENU_NAME)
  if (legacy.length > 0) {
    console.log(`→ 旧APIメニュー "${LEGACY_MENU_NAME}" を削除します（${legacy.length}件）…`)
    for (const m of legacy) {
      const ok = await deleteRichMenu(m.richMenuId)
      console.log(`  ${ok ? "✓" : "✖"} ${m.richMenuId}`)
    }
  } else {
    console.log(`→ 旧APIメニュー "${LEGACY_MENU_NAME}" は見つかりません（削除不要）`)
  }

  console.log("")
  console.log("🎉 完了。LINE トークを開き直す（or ブロック→解除）と、")
  console.log("   管理画面(Manager)で公開したリッチメニューが表示されます。")
  console.log("   ※ それでも出ない場合は、Manager 側でメニューが『公開/表示中』かつ")
  console.log("     表示期間の開始日時が現在以前になっているか確認してください。")
}

main().catch((e) => {
  console.error("✖ 予期しないエラー:", e)
  process.exit(1)
})
