/**
 * scripts/setup-line-rich-menu.ts
 *
 * LINE 公式アカウントの Rich Menu を作成 / 画像アップロード / デフォルト割当する一回実行スクリプト。
 *
 * 実行方法:
 *   pnpm tsx scripts/setup-line-rich-menu.ts
 *
 * 必要な環境変数（.env.local / Vercel 共通）:
 *   LINE_CHANNEL_ACCESS_TOKEN
 *
 * 必要なファイル:
 *   scripts/rich-menu.png  ... 2500x1686 px の PNG
 *     - 用意できない場合、scripts/rich-menu-template.svg を Canva / Figma 等で
 *       PNG エクスポートしてください。サイズ厳密。
 *
 * Rich Menu は 2 行 3 列の 6 ボタン構成（面談・ポイント導線を前面に）:
 *
 *   ┌──────────────┬────────────┬──────────────┐
 *   │ 無料相談・面談│ 求人を探す │ ポイント・抽選│
 *   ├──────────────┼────────────┼──────────────┤
 *   │ 適職診断     │  マガジン  │ お問い合わせ │
 *   └──────────────┴────────────┴──────────────┘
 *
 * 「無料相談・面談」は公式 LINE → フォーム入力（/contact）の導線。
 * 専用の面談予約フォーム / LIFF がある場合は uri を差し替えてください。
 * 既存の Rich Menu は削除して作り直す。
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// .env.local / .env を自前で読み込み、process.env にセット（既存値は上書きしない）。
// tsx は dotenv を自動で読み込まないため、Next.js 経由でない実行で必要。
function loadDotEnv(): void {
  const candidates = [".env.local", ".env"]
  for (const file of candidates) {
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
      // 引用符を取り除く
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}
loadDotEnv()

import {
  createRichMenu,
  uploadRichMenuImage,
  setDefaultRichMenu,
  listRichMenus,
  deleteRichMenu,
  isMessagingConfigured,
} from "../src/lib/line-messaging"

const SITE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"
const IMAGE_PATH = join(process.cwd(), "scripts", "rich-menu.png")

const WIDTH = 2500
const HEIGHT = 1686
const COL_W = Math.floor(WIDTH / 3)
const ROW_H = Math.floor(HEIGHT / 2)

const richMenuDef = {
  size: { width: WIDTH, height: HEIGHT },
  selected: true,
  name: "GenbaCareer Main Menu",
  chatBarText: "メニュー",
  areas: [
    // 上段: 面談相談 / 求人 / ポイント抽選 を最優先導線として配置
    {
      bounds: { x: 0, y: 0, width: COL_W, height: ROW_H },
      action: {
        type: "uri" as const,
        label: "無料相談・面談",
        // 公式 LINE → フォーム入力の導線。専用の面談予約フォームがあれば差し替える。
        uri: `${SITE}/contact?source=line_consult`,
      },
    },
    {
      bounds: { x: COL_W, y: 0, width: COL_W, height: ROW_H },
      action: { type: "uri" as const, label: "求人を探す", uri: `${SITE}/jobs` },
    },
    {
      bounds: { x: COL_W * 2, y: 0, width: WIDTH - COL_W * 2, height: ROW_H },
      action: {
        type: "uri" as const,
        label: "ポイント・抽選",
        uri: `${SITE}/mypage/rewards?source=line_richmenu`,
      },
    },
    // 下段: 適職診断 / マガジン / お問い合わせ
    {
      bounds: { x: 0, y: ROW_H, width: COL_W, height: HEIGHT - ROW_H },
      action: {
        type: "uri" as const,
        label: "適職診断",
        uri: `${SITE}/shindan?source=line_richmenu`,
      },
    },
    {
      bounds: { x: COL_W, y: ROW_H, width: COL_W, height: HEIGHT - ROW_H },
      action: { type: "uri" as const, label: "マガジン", uri: `${SITE}/journal` },
    },
    {
      bounds: { x: COL_W * 2, y: ROW_H, width: WIDTH - COL_W * 2, height: HEIGHT - ROW_H },
      action: {
        type: "uri" as const,
        label: "お問い合わせ",
        uri: `${SITE}/contact?source=line_richmenu`,
      },
    },
  ],
}

/**
 * 画像が存在しなければ、SVG ベースで自動生成 → sharp で PNG に変換して保存。
 * Canva 等で差し替えたい場合は手動で scripts/rich-menu.png を上書きすればこの分岐はスキップされる。
 */
async function ensureImage() {
  if (existsSync(IMAGE_PATH)) {
    console.log(`→ 既存画像を使用: ${IMAGE_PATH}`)
    return
  }
  console.log("→ Rich Menu 画像が無いので SVG から自動生成します…")

  // ※ areas（ボタン定義）と同じ並び順にすること
  const cells = [
    { label: "無料相談・面談", sub: "SODAN",    bg: "#fff7ed", emoji: "💬" },
    { label: "求人を探す",    sub: "JOBS",     bg: "#fffbeb", emoji: "🔍" },
    { label: "ポイント・抽選", sub: "POINT",    bg: "#fff7ed", emoji: "🎁" },
    { label: "適職診断",      sub: "SHINDAN",  bg: "#ffffff", emoji: "🧭" },
    { label: "マガジン",      sub: "MAGAZINE", bg: "#ffffff", emoji: "📰" },
    { label: "お問い合わせ",   sub: "CONTACT",  bg: "#ffffff", emoji: "📩" },
  ]

  const W = WIDTH, H = HEIGHT, cw = COL_W, ch = ROW_H
  const cellSvg = cells
    .map((c, i) => {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = col * cw
      const y = row * ch
      return `
    <g transform="translate(${x}, ${y})">
      <rect width="${cw}" height="${ch}" fill="${c.bg}" stroke="#e7e5e4" stroke-width="4"/>
      <text x="${cw / 2}" y="${ch / 2 - 110}" text-anchor="middle"
        font-family="-apple-system, 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif"
        font-size="200" fill="#f37524">${c.emoji}</text>
      <text x="${cw / 2}" y="${ch / 2 + 70}" text-anchor="middle"
        font-family="-apple-system, 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif"
        font-size="56" fill="#c2410c" font-weight="700" letter-spacing="3">${c.sub}</text>
      <text x="${cw / 2}" y="${ch / 2 + 170}" text-anchor="middle"
        font-family="-apple-system, 'Hiragino Sans', 'Yu Gothic', Meiryo, sans-serif"
        font-size="92" fill="#14181b" font-weight="900">${c.label}</text>
    </g>`
    })
    .join("")

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  ${cellSvg}
  <!-- 上下に brand yellow ストライプを差してフラット感を破る -->
  <rect x="0" y="0" width="${W}" height="14" fill="#f5b400"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#f5b400"/>
</svg>`

  // sharp は SVG の <text> をシステムフォントで render する。
  // ローカル実行（macOS / Windows / Linux）でシステムに sans 日本語フォントがあれば描画される。
  const sharp = (await import("sharp")).default
  const buffer = await sharp(Buffer.from(svg), { density: 72 }).png().toBuffer()
  writeFileSync(IMAGE_PATH, buffer)
  console.log(`  ✓ 自動生成完了: ${IMAGE_PATH}`)
  console.log("    （Canva 等で差し替えたい場合は同パスを上書きしてください）")
}

async function main() {
  if (!isMessagingConfigured()) {
    console.error("✖ LINE_CHANNEL_ACCESS_TOKEN / LINE_CHANNEL_SECRET が未設定です")
    console.error("  .env.local もしくは Vercel 環境変数を確認してください")
    process.exit(1)
  }

  await ensureImage()

  // 既存メニュー削除（重複定義を避ける）
  console.log("→ 既存 Rich Menu を確認…")
  const existing = await listRichMenus()
  for (const rm of existing) {
    console.log(`  - 削除: ${rm.richMenuId} (${rm.name})`)
    await deleteRichMenu(rm.richMenuId)
  }

  console.log("→ 新規 Rich Menu を作成…")
  const richMenuId = await createRichMenu(richMenuDef)
  if (!richMenuId) {
    console.error("✖ Rich Menu 作成に失敗")
    process.exit(1)
  }
  console.log(`  ✓ richMenuId = ${richMenuId}`)

  console.log("→ 画像をアップロード…")
  const imageBuffer = readFileSync(IMAGE_PATH)
  const uploaded = await uploadRichMenuImage(richMenuId, imageBuffer, "image/png")
  if (!uploaded) {
    console.error("✖ 画像アップロードに失敗")
    process.exit(1)
  }
  console.log("  ✓ アップロード完了")

  console.log("→ デフォルト Rich Menu に設定…")
  const setDefault = await setDefaultRichMenu(richMenuId)
  if (!setDefault) {
    console.error("✖ デフォルト割り当てに失敗")
    process.exit(1)
  }
  console.log("  ✓ 完了")

  console.log("")
  console.log("🎉 Rich Menu のセットアップが完了しました")
  console.log("   LINE 公式アカウントを友だち追加して動作確認してください")
}

main().catch((e) => {
  console.error("✖ 予期しないエラー:", e)
  process.exit(1)
})
