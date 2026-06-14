/**
 * scripts/line-doctor.ts
 *
 * LINE Messaging API の「効力確認」と「配信候補の健全性診断」を
 * 読み取り専用（状態を一切変更しない）で行う運用スクリプト。
 *
 * setup-line-rich-menu.ts はリッチメニューを作り直す破壊的操作なので、
 * 「トークンが本当に有効か」だけを安全に確かめたい時はこちらを使う。
 *
 * 実行方法:
 *   pnpm tsx scripts/line-doctor.ts
 *   pnpm tsx scripts/line-doctor.ts --push <LINE_USER_ID>   # 任意: 実際に1通テスト送信
 *
 * 必要な環境変数（.env.local / Vercel 共通）:
 *   LINE_CHANNEL_ACCESS_TOKEN  ... トークン有効性チェックに必須
 *   LINE_CHANNEL_SECRET        ... 署名検証用（任意・presence のみ確認）
 *   DATABASE_URL               ... 配信候補(LineLead/User)の集計に必要
 *
 * 終了コード: 致命的問題（トークン無効など）があれば 1、なければ 0。
 */

import { readFileSync, existsSync } from "node:fs"
import { join } from "node:path"

// tsx は dotenv を自動で読み込まないため、.env.local / .env を自前で読み込む。
// （既存の process.env は上書きしない）
function loadDotEnv(): void {
  for (const file of [".env.local", ".env"]) {
    const path = join(process.cwd(), file)
    if (!existsSync(path)) continue
    const content = readFileSync(path, "utf8")
    for (const rawLine of content.split(/\r?\n/)) {
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
  getBotInfo,
  getMessageQuota,
  getQuotaConsumption,
  pushMessage,
} from "../src/lib/line-messaging"

const ok = (s: string) => console.log(`  \x1b[32m✓\x1b[0m ${s}`)
const warn = (s: string) => console.log(`  \x1b[33m!\x1b[0m ${s}`)
const ng = (s: string) => console.log(`  \x1b[31m✖\x1b[0m ${s}`)
const head = (s: string) => console.log(`\n\x1b[1m${s}\x1b[0m`)

async function checkEnv(): Promise<boolean> {
  head("1. 環境変数")
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
  const secret = process.env.LINE_CHANNEL_SECRET ?? ""
  if (token) ok(`LINE_CHANNEL_ACCESS_TOKEN 設定済み (len=${token.length})`)
  else ng("LINE_CHANNEL_ACCESS_TOKEN 未設定")
  if (secret) ok(`LINE_CHANNEL_SECRET 設定済み (len=${secret.length})`)
  else warn("LINE_CHANNEL_SECRET 未設定（Webhook 署名検証が無効）")
  return isMessagingConfigured()
}

async function checkToken(): Promise<boolean> {
  head("2. トークン効力（GET /v2/bot/info）")
  const res = await getBotInfo()
  if (!res.ok) {
    ng(`トークン無効/失効の可能性: HTTP ${res.status} ${res.body}`)
    if (res.status === 401) warn("→ 401: アクセストークンが間違っているか失効しています")
    if (res.status === 403) warn("→ 403: Messaging API が無効、またはプラン制限です")
    return false
  }
  ok(`トークン有効: ${res.info.displayName} (${res.info.basicId})`)
  console.log(`     botUserId : ${res.info.userId}`)
  if (res.info.premiumId) console.log(`     premiumId : ${res.info.premiumId}`)
  if (res.info.chatMode) console.log(`     chatMode  : ${res.info.chatMode}`)

  const quota = await getMessageQuota()
  const used = await getQuotaConsumption()
  if (quota) {
    if (quota.type === "none") ok("Push 送信枠: 無制限プラン")
    else {
      const remain = used != null ? quota.value - used : null
      ok(
        `Push 送信枠: 上限 ${quota.value} / 当月送信 ${used ?? "?"}` +
          (remain != null ? ` / 残り ${remain}` : "")
      )
      if (remain != null && remain <= 0) warn("→ 送信枠を使い切っています。配信が届きません")
    }
  }
  return true
}

async function checkRecipients(): Promise<void> {
  head("3. 配信候補（LineLead / User の突き合わせ）")
  if (!process.env.DATABASE_URL) {
    warn("DATABASE_URL 未設定のため DB 集計をスキップ")
    return
  }
  // DB 接続は token チェックと独立させたいので遅延 import。
  const { prisma } = await import("../src/lib/db")
  try {
    const [total, withLineId, optedOut, eligible] = await Promise.all([
      prisma.lineLead.count(),
      prisma.lineLead.count({ where: { lineUserId: { not: null } } }),
      prisma.lineLead.count({ where: { optedOut: true } }),
      prisma.lineLead.count({
        where: { lineUserId: { not: null }, optedOut: false },
      }),
    ])
    console.log(`     LineLead 総数          : ${total}`)
    console.log(`     うち lineUserId あり    : ${withLineId}`)
    console.log(`     うち optedOut(配信停止) : ${optedOut}`)
    if (eligible > 0) ok(`実配信候補（友だち & 未停止）: ${eligible} 件`)
    else
      ng(
        "実配信候補が 0 件。LINE 友だち追加時の Webhook で lineUserId が保存されているか確認してください"
      )

    // 通知系（pushUserNotification）は User.email と LineLead.email の一致が前提。
    const usersWithEmail = await prisma.user.count({ where: { email: { not: "" } } })
    console.log(`     email を持つ User       : ${usersWithEmail}`)
    if (withLineId > 0 && usersWithEmail === 0)
      warn("→ User が居ないため email 突き合わせの個別 Push は届きません")
  } catch (e) {
    ng(`DB 集計に失敗: ${e instanceof Error ? e.message : String(e)}`)
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

async function maybePush(): Promise<void> {
  const idx = process.argv.indexOf("--push")
  if (idx < 0) return
  const to = process.argv[idx + 1]
  head("4. テスト送信（--push）")
  if (!to) {
    ng("--push の後に送信先 LINE userId を指定してください")
    return
  }
  await pushMessage(to, [
    { type: "text", text: "【ゲンバキャリア】LINE 配信テストです。これが届けば設定は正常です。" },
  ])
  ok(`Push 送信を試行しました → ${to}（届かない場合は上の枠/友だち状態を確認）`)
}

async function main() {
  console.log("=== LINE Doctor （読み取り専用診断） ===")
  const configured = await checkEnv()
  let tokenValid = false
  if (configured) tokenValid = await checkToken()
  else warn("トークン未設定のため API チェックをスキップ")
  await checkRecipients()
  await maybePush()

  head("結果")
  if (!configured) {
    ng("LINE が未設定です（.env.local にトークンを入れて再実行してください）")
    process.exit(1)
  }
  if (!tokenValid) {
    ng("トークンが無効です。Vercel の LINE_CHANNEL_ACCESS_TOKEN を更新してください")
    process.exit(1)
  }
  ok("トークンは有効です。あとは配信候補が 0 でなければ実配信できます")
}

main().catch((e) => {
  console.error("✖ 予期しないエラー:", e)
  process.exit(1)
})
