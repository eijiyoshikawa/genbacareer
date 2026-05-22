/**
 * 共通メールテンプレート。
 *
 * 全 10 種類のシステムメールを 1 つのレイアウト関数で生成する。
 * - ヘッダー: ゲンバキャリア ロゴバー (黒地 + アクセントカラー)
 * - メインコンテンツ: 注意書き → 宛名 → 段落 → 主 CTA → 期限 → kv 表 → 副 CTA
 * - フッター: 株式会社LET / サイト URL / ヘルプ / 配信停止案内
 *
 * 設計方針:
 * - HTML テーブルレイアウトは使わず、シンプルな div + inline style で構成。
 *   多くのモダンメールクライアント (Gmail / Apple Mail / Outlook 2016+) で問題なく描画される。
 * - プレーンテキスト版も同時生成し、multipart/alternative で送信。
 * - ブランドカラーは globals.css の `--color-primary-600 = #e25c0e` を使用。
 */

/** ブランド配色 (globals.css の --color-primary-* と一致) */
const BRAND = {
  /** 黒系背景 (ヘッダー / フッター) */
  dark: "#18181b",
  /** アクセントイエロー (ヘッダー文字色) */
  accent: "#facc15",
  /** プライマリオレンジ (CTA / 強調) */
  primary: "#e25c0e",
  /** プライマリ濃いめ (hover 想定、メールでは未使用だが定数として保持) */
  primaryHover: "#c2410c",
  /** サクセス緑 (登録承認系 CTA) */
  success: "#16a34a",
  /** 警告赤 (期限明示) */
  warn: "#b91c1c",
  /** テキスト本文 */
  text: "#1a1a1a",
  /** テキスト弱 */
  muted: "#737373",
  /** 区切り線 */
  divider: "#e5e5e5",
  /** 薄背景 */
  softBg: "#fafafa",
} as const

/** CTA ボタンのバリアント */
export type CtaVariant = "primary" | "success" | "neutral"

/** Key-Value 表の 1 行 */
export interface KvRow {
  label: string
  value: string
}

/** メール CTA ボタン */
export interface EmailCta {
  label: string
  url: string
  variant?: CtaVariant
}

/** メールレイアウトのオプション */
export interface EmailLayoutOptions {
  /**
   * 件名直下に表示するプレビュー一文 (preheader)。
   * 受信箱で件名の隣に表示される。省略可。
   */
  preheader?: string

  /**
   * メール冒頭の注意書きブロック (黄色背景の警告など)。
   * 通常は使わない。スカウトメールのみ「期限が近い」訴求で使用。
   */
  notice?: string

  /** 自動送信注意の固定文 (デフォルト 2 行) を出すか。default true */
  showAutoSendNotice?: boolean

  /** 宛名 (例: "山田太郎 様") */
  greeting?: string

  /**
   * 本文段落。1 段落 = 1 文字列。空文字 / null は無視。
   * 改行は \n で OK (br に変換される)。
   */
  paragraphs?: (string | null | undefined)[]

  /** 主 CTA ボタン (省略可) */
  cta?: EmailCta

  /** 期限明示 (CTA の直下に「期限: 2026 年 5 月 21 日（木）」) */
  expiresAt?: Date

  /** Key-Value 表 (求人タイトル + 企業名 / 応募 ID など) */
  kv?: KvRow[]

  /** kv の前に表示する見出し */
  kvHeading?: string

  /** kv の下に表示する詳細セクション (件名 + 本文抜粋など) */
  detailSection?: {
    heading?: string
    body: string
  }

  /** 副 CTA リンク (テキストリンク、主 CTA の下) */
  secondaryLink?: { label: string; url: string }

  /**
   * 配信停止案内。表示するときは text + url を必ず指定。
   * 例: scoutEmail / saved-search-alert などのオプトアウト可能なメールでのみ表示。
   */
  unsubscribe?: { label: string; url: string }
}

/**
 * 期限を JST タイムゾーン固定で「2026 年 5 月 21 日（木）」に整形。
 * サーバが UTC でも JST でも一貫した表示になる。
 */
export function formatExpiry(d: Date): string {
  const parts = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).formatToParts(d)
  const y = parts.find((p) => p.type === "year")?.value ?? ""
  const m = parts.find((p) => p.type === "month")?.value ?? ""
  const day = parts.find((p) => p.type === "day")?.value ?? ""
  const wd = parts.find((p) => p.type === "weekday")?.value ?? ""
  return `${y} 年 ${m} 月 ${day} 日（${wd}）`
}

/** HTML エスケープ (テンプレ内で attr / 本文に使う) */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/** ベース URL (NEXTAUTH_URL → NEXT_PUBLIC_SITE_URL → localhost) */
export function baseUrl(): string {
  return (
    process.env.NEXTAUTH_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  )
}

function ctaColors(variant: CtaVariant = "primary"): { bg: string; fg: string } {
  switch (variant) {
    case "success":
      return { bg: BRAND.success, fg: "#ffffff" }
    case "neutral":
      return { bg: BRAND.dark, fg: BRAND.accent }
    case "primary":
    default:
      return { bg: BRAND.primary, fg: "#ffffff" }
  }
}

/**
 * メール HTML を組み立てる。
 *
 * 重要な制約:
 * - inline style のみ使用 (Gmail は <style> をストリップする)
 * - flex / grid は使わない (Outlook 互換)
 * - max-width: 600px の中央寄せ
 */
export function renderEmailLayout(opts: EmailLayoutOptions): string {
  const site = baseUrl()
  const helpUrl = `${site}/help`
  const showAutoSendNotice = opts.showAutoSendNotice !== false

  const preheaderHtml = opts.preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fafafa;">${escapeHtml(
        opts.preheader,
      )}</div>`
    : ""

  const noticeHtml = opts.notice
    ? `<div style="background:#fef3c7;border-left:4px solid ${BRAND.warn};padding:12px 16px;margin:0 0 20px;color:${BRAND.text};font-size:14px;">${escapeHtml(
        opts.notice,
      )}</div>`
    : ""

  const autoNoticeHtml = showAutoSendNotice
    ? `<p style="font-size:12px;color:${BRAND.muted};margin:0 0 4px;">※このメールは「ゲンバキャリア」のシステムから自動送信しています。</p>
       <p style="font-size:12px;color:${BRAND.muted};margin:0 0 20px;">※この通知メールへ返信いただいても、運営および企業へは届きませんのでご注意ください。</p>`
    : ""

  const greetingHtml = opts.greeting
    ? `<p style="margin:0 0 12px;font-size:15px;color:${BRAND.text};">${escapeHtml(opts.greeting)}</p>`
    : ""

  const paragraphsHtml = (opts.paragraphs ?? [])
    .filter((p): p is string => Boolean(p && p.trim()))
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:${BRAND.text};">${escapeHtml(
          p,
        ).replace(/\n/g, "<br>")}</p>`,
    )
    .join("")

  const ctaHtml = opts.cta
    ? (() => {
        const { bg, fg } = ctaColors(opts.cta.variant)
        return `<p style="margin:24px 0;text-align:left;">
          <a href="${opts.cta.url}" style="display:inline-block;padding:14px 28px;background:${bg};color:${fg};text-decoration:none;font-weight:bold;font-size:15px;border-radius:6px;">${escapeHtml(
            opts.cta.label,
          )}</a>
        </p>`
      })()
    : ""

  const expiresHtml = opts.expiresAt
    ? `<p style="font-size:14px;margin:0 0 6px;color:${BRAND.text};">有効期限: <strong style="color:${BRAND.warn};">${escapeHtml(formatExpiry(opts.expiresAt))}</strong></p>
       <p style="font-size:12px;color:${BRAND.muted};margin:0 0 20px;">※有効期限前に応募を締め切る場合がありますのでお早めにご対応ください。</p>`
    : ""

  const kvHeadingHtml = opts.kvHeading
    ? `<p style="font-weight:bold;font-size:14px;margin:0 0 8px;color:${BRAND.text};">${escapeHtml(opts.kvHeading)}</p>`
    : ""

  const kvHtml =
    opts.kv && opts.kv.length > 0
      ? `<table cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;width:100%;margin:0 0 20px;font-size:14px;">
           ${opts.kv
             .map(
               (row) => `
             <tr>
               <td style="padding:8px 12px;border:1px solid ${BRAND.divider};background:${BRAND.softBg};width:140px;color:${BRAND.muted};font-weight:bold;vertical-align:top;">${escapeHtml(row.label)}</td>
               <td style="padding:8px 12px;border:1px solid ${BRAND.divider};color:${BRAND.text};">${escapeHtml(row.value)}</td>
             </tr>`,
             )
             .join("")}
         </table>`
      : ""

  const detailHtml = opts.detailSection
    ? `<div style="border-top:1px solid ${BRAND.divider};padding-top:20px;margin-top:20px;">
        ${opts.detailSection.heading ? `<p style="font-weight:bold;font-size:14px;margin:0 0 8px;color:${BRAND.text};">${escapeHtml(opts.detailSection.heading)}</p>` : ""}
        <p style="margin:0 0 12px;font-size:14px;color:${BRAND.text};white-space:pre-line;line-height:1.7;">${escapeHtml(
          opts.detailSection.body,
        )}</p>
      </div>`
    : ""

  const secondaryHtml = opts.secondaryLink
    ? `<p style="margin:0 0 24px;font-size:14px;"><a href="${opts.secondaryLink.url}" style="color:${BRAND.primary};text-decoration:underline;">${escapeHtml(opts.secondaryLink.label)}</a></p>`
    : ""

  const unsubscribeHtml = opts.unsubscribe
    ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid ${BRAND.divider};">
        <p style="font-size:12px;color:${BRAND.muted};margin:0 0 4px;">このメールの配信を停止する場合</p>
        <p style="font-size:12px;color:${BRAND.muted};margin:0;">→ <a href="${opts.unsubscribe.url}" style="color:${BRAND.primary};">${escapeHtml(opts.unsubscribe.label)}</a></p>
      </div>`
    : ""

  return `<!doctype html>
<html lang="ja">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ゲンバキャリア</title></head>
  <body style="margin:0;padding:0;background:${BRAND.softBg};font-family:-apple-system,BlinkMacSystemFont,'Hiragino Sans','Hiragino Kaku Gothic ProN','Yu Gothic UI','Meiryo',sans-serif;color:${BRAND.text};">
    ${preheaderHtml}
    <div style="max-width:600px;margin:0 auto;background:#ffffff;">
      <!-- Header -->
      <div style="background:${BRAND.dark};color:${BRAND.accent};padding:16px 24px;font-weight:bold;font-size:18px;letter-spacing:0.04em;">
        ゲンバキャリア
      </div>

      <!-- Main -->
      <div style="padding:28px 24px;">
        ${noticeHtml}
        ${autoNoticeHtml}
        ${greetingHtml}
        ${paragraphsHtml}
        ${ctaHtml}
        ${expiresHtml}
        ${kvHeadingHtml}
        ${kvHtml}
        ${detailHtml}
        ${secondaryHtml}
        ${unsubscribeHtml}
      </div>

      <!-- Footer -->
      <div style="background:${BRAND.dark};color:#a1a1aa;padding:20px 24px;font-size:12px;line-height:1.7;">
        <p style="margin:0 0 4px;color:#fafafa;font-weight:bold;">株式会社LET</p>
        <p style="margin:0 0 4px;">ゲンバキャリア — 建設業界特化型 求人サイト</p>
        <p style="margin:0 0 4px;">
          <a href="${site}" style="color:${BRAND.accent};text-decoration:none;">${site}</a>
        </p>
        <p style="margin:8px 0 0;">
          <a href="${helpUrl}" style="color:#a1a1aa;text-decoration:underline;">ヘルプ</a>
          <span style="color:#52525b;">  ・  </span>
          <a href="${site}/privacy" style="color:#a1a1aa;text-decoration:underline;">プライバシー</a>
          <span style="color:#52525b;">  ・  </span>
          <a href="${site}/terms" style="color:#a1a1aa;text-decoration:underline;">利用規約</a>
        </p>
      </div>
    </div>
  </body>
</html>`
}

/**
 * メールのプレーンテキスト版を組み立てる。
 *
 * HTML をストリップせず、`renderEmailLayout()` と同じ情報を別フォーマットで再構築する。
 * これにより multipart/alternative で「テキストのみ受信」「迷惑メール判定向上」両方に対応。
 */
export function renderEmailText(opts: EmailLayoutOptions): string {
  const site = baseUrl()
  const lines: string[] = []

  lines.push("【ゲンバキャリア — 建設業界特化型 求人サイト】")
  lines.push("=".repeat(40))
  lines.push("")

  if (opts.notice) {
    lines.push(`【!】${opts.notice}`)
    lines.push("")
  }

  if (opts.showAutoSendNotice !== false) {
    lines.push("※このメールは「ゲンバキャリア」のシステムから自動送信しています。")
    lines.push("※この通知メールへ返信いただいても、運営および企業へは届きません。")
    lines.push("")
  }

  if (opts.greeting) {
    lines.push(opts.greeting)
    lines.push("")
  }

  ;(opts.paragraphs ?? [])
    .filter((p): p is string => Boolean(p && p.trim()))
    .forEach((p) => {
      lines.push(p)
      lines.push("")
    })

  if (opts.cta) {
    lines.push(`▼ ${opts.cta.label}`)
    lines.push(`${opts.cta.url}`)
    lines.push("")
  }

  if (opts.expiresAt) {
    lines.push(`■ 有効期限: ${formatExpiry(opts.expiresAt)}`)
    lines.push("※有効期限前に応募を締め切る場合があります。")
    lines.push("")
  }

  if (opts.kvHeading) {
    lines.push(`■ ${opts.kvHeading}`)
  }

  if (opts.kv && opts.kv.length > 0) {
    opts.kv.forEach((r) => lines.push(`  ${r.label}: ${r.value}`))
    lines.push("")
  }

  if (opts.detailSection) {
    if (opts.detailSection.heading) lines.push(`■ ${opts.detailSection.heading}`)
    lines.push(opts.detailSection.body)
    lines.push("")
  }

  if (opts.secondaryLink) {
    lines.push(`→ ${opts.secondaryLink.label}: ${opts.secondaryLink.url}`)
    lines.push("")
  }

  if (opts.unsubscribe) {
    lines.push("-".repeat(40))
    lines.push(`配信停止: ${opts.unsubscribe.label}`)
    lines.push(`${opts.unsubscribe.url}`)
  }

  lines.push("")
  lines.push("=".repeat(40))
  lines.push("株式会社LET")
  lines.push(site)
  lines.push(`ヘルプ: ${site}/help`)

  return lines.join("\n")
}
