#!/usr/bin/env tsx
/**
 * Pre-deploy 必須環境変数チェック。
 *
 *   pnpm check:env                   # local .env.local をチェック
 *   pnpm check:env --strict          # 警告も失敗扱い
 *   pnpm check:env --env=production  # production 想定の必須セットでチェック
 *
 * 想定: Vercel デプロイ前に通すと、env 設定漏れで本番障害を起こすのを防げる。
 */
import { existsSync } from "node:fs"
import { readFileSync } from "node:fs"
import { join } from "node:path"

type EnvDef = {
  name: string
  /** どの環境で必須か */
  required: ("local" | "preview" | "production")[]
  description: string
  /** 値のバリデーション（true で OK） */
  validate?: (value: string) => boolean | string
}

const ENV_DEFS: EnvDef[] = [
  // ----- DB -----
  {
    name: "DATABASE_URL",
    required: ["local", "preview", "production"],
    description: "Supabase Pooler URL (pgbouncer)",
    validate: (v) =>
      v.startsWith("postgres") || "postgres:// で始まる URL が必要",
  },
  {
    name: "DIRECT_URL",
    required: ["local", "preview", "production"],
    description: "Supabase Direct URL (Migration / Cron 用)",
    validate: (v) =>
      v.startsWith("postgres") || "postgres:// で始まる URL が必要",
  },
  {
    name: "ENSURE_SCHEMA",
    required: [],
    description:
      "ensureSchema (cold start で 53 件の ALTER/INDEX を流す) の有効化。本番安定後は 'false' 推奨",
  },
  // ----- NextAuth -----
  {
    name: "NEXTAUTH_SECRET",
    required: ["preview", "production"],
    description: "NextAuth セッション暗号化キー (32 文字以上推奨)",
    validate: (v) =>
      v.length >= 32 || "32 文字以上のランダム文字列を推奨",
  },
  {
    name: "NEXTAUTH_URL",
    required: ["preview", "production"],
    description: "本番ドメイン (例: https://www.genbacareer.jp)",
    validate: (v) =>
      v.startsWith("https://") || "https:// で始まる URL が必要",
  },
  {
    name: "AUTH_SECRET",
    required: [],
    description: "NextAuth v5 互換のシークレット (NEXTAUTH_SECRET と同値で OK)",
  },
  // ----- Site -----
  {
    name: "NEXT_PUBLIC_BASE_URL",
    required: ["preview", "production"],
    description: "サイトの本番 URL (sitemap / OGP / 構造化データに使用)",
  },
  {
    name: "APP_BASE_URL",
    required: ["production"],
    description:
      "OAuth callback URL の生成元 (例: https://www.genbacareer.jp)。Calendar OAuth 等に使用",
    validate: (v) =>
      v.startsWith("https://") || "https:// で始まる URL が必要",
  },
  // ----- Cron / GbizINFO -----
  {
    name: "CRON_SECRET",
    required: ["production"],
    description: "Vercel Cron 認証用シークレット (auto-fill されない)",
    validate: (v) => v.length >= 32 || "32 文字以上を推奨",
  },
  {
    name: "GBIZ_API_TOKEN",
    required: [],
    description: "GbizINFO API トークン (未設定でも UI は動作するが企業情報取得は不可)",
  },
  // ----- Supabase Storage (画像アップロード) -----
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    required: ["production"],
    description: "Supabase プロジェクト URL (画像アップロードに必須)",
    validate: (v) =>
      v.startsWith("https://") || "https:// で始まる URL が必要",
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    required: ["production"],
    description:
      "Supabase Service Role Key (Storage への書き込み権限。企業ロゴ / 写真 / 履歴書アップ用)",
  },
  // ----- メール (Gmail / SendGrid のいずれか) -----
  {
    name: "SMTP_USER",
    required: ["production"],
    description: "Gmail Workspace 送信元 (例: genbacareer@let-inc.net)",
  },
  {
    name: "SMTP_PASS",
    required: ["production"],
    description: "Gmail アプリパスワード (16 桁、2 段階認証必須)",
    validate: (v) =>
      v.replace(/\s/g, "").length === 16 ||
      "Gmail アプリパスワードは 16 文字（半角・空白許容）です",
  },
  {
    name: "MAIL_FROM",
    required: [],
    description:
      'メール From ヘッダ (任意、未設定なら SMTP_USER から自動生成)',
  },
  // ----- LINE Messaging API (応募導線) -----
  {
    name: "LINE_CHANNEL_ID",
    required: ["production"],
    description: "LINE Messaging API チャネル ID",
  },
  {
    name: "LINE_CHANNEL_SECRET",
    required: ["production"],
    description: "LINE Messaging API シークレット",
  },
  {
    name: "LINE_CHANNEL_ACCESS_TOKEN",
    required: ["production"],
    description: "LINE Messaging API アクセストークン",
  },
  {
    name: "LINE_OA_ID",
    required: ["production"],
    description: "LINE 公式アカウント Basic ID (応募メッセージの誘導先)",
  },
  {
    name: "NEXT_PUBLIC_LINE_OA_ID",
    required: ["production"],
    description: "LINE 公式アカウント ID のクライアント公開版 (LINE_OA_ID と同値)",
  },
  // ----- LINE Login (1 タップ登録 / ログイン) -----
  {
    name: "LINE_CLIENT_ID",
    required: [],
    description:
      "LINE Login OAuth クライアント ID (求職者の 1 タップ登録用、未設定なら LINE ログインボタンが 401)",
  },
  {
    name: "LINE_CLIENT_SECRET",
    required: [],
    description: "LINE Login OAuth シークレット",
  },
  // ----- LIFF (LINE 内ブラウザでの応募) -----
  {
    name: "NEXT_PUBLIC_LIFF_ID",
    required: [],
    description: "LIFF アプリ ID (LINE 内ブラウザから応募する場合に使用)",
  },
  // ----- Google OAuth (Calendar 連携 + ログイン) -----
  {
    name: "GOOGLE_CALENDAR_CLIENT_ID",
    required: ["production"],
    description:
      "企業向け Google Calendar 連携。OAuth 同意画面を本番公開しないと 7 日でリフレッシュトークン失効",
  },
  {
    name: "GOOGLE_CALENDAR_CLIENT_SECRET",
    required: ["production"],
    description: "Google Calendar OAuth シークレット",
  },
  {
    name: "GOOGLE_CLIENT_ID",
    required: [],
    description:
      "NextAuth Google ログインプロバイダ (未設定なら Google ログインボタンが消える)",
  },
  {
    name: "GOOGLE_CLIENT_SECRET",
    required: [],
    description: "NextAuth Google ログインシークレット",
  },
  // ----- Search Console (cron 連携) -----
  {
    name: "GSC_OAUTH_CLIENT_ID",
    required: [],
    description:
      "Search Console データ取得用 OAuth (未設定なら /admin/search-console は空)",
  },
  {
    name: "GSC_OAUTH_CLIENT_SECRET",
    required: [],
    description: "Search Console OAuth シークレット",
  },
  {
    name: "GSC_OAUTH_REFRESH_TOKEN",
    required: [],
    description:
      "Search Console リフレッシュトークン (OAuth Playground で取得、本番公開しないと 7 日失効)",
  },
  {
    name: "GSC_SITE_URL",
    required: [],
    description:
      "Search Console プロパティ URL (例: sc-domain:genbacareer.jp / https://www.genbacareer.jp/)",
  },
  // ----- 公共求人 (ハローワーク API) -----
  {
    name: "HELLOWORK_API_USER",
    required: [],
    description: "ハローワーク API ユーザー ID (未設定なら自動取り込み停止)",
  },
  {
    name: "HELLOWORK_API_PASS",
    required: [],
    description: "ハローワーク API パスワード",
  },
  // ----- Admin (管理者ログイン) -----
  {
    name: "ADMIN_EMAIL",
    required: ["production"],
    description: "管理者ログイン用メールアドレス",
  },
  {
    name: "ADMIN_PASSWORD_HASH",
    required: ["production"],
    description:
      "管理者パスワード bcrypt ハッシュ (pnpm gen:secret で生成、平文 NG)",
    validate: (v) =>
      v.startsWith("$2") || "bcrypt ハッシュ ($2a/2b/2y で始まる) が必要",
  },
  // Stripe は 2026-05 に廃止 (景品表示法対応の方針見直しに伴い MoneyForward 一本化)。
  // ----- MoneyForward (請求書、任意) -----
  {
    name: "MF_CLIENT_ID",
    required: [],
    description: "MoneyForward クラウド請求書 API クライアント ID",
  },
  {
    name: "MF_CLIENT_SECRET",
    required: [],
    description: "MoneyForward API シークレット",
  },
  {
    name: "MF_OFFICE_ID",
    required: [],
    description: "MoneyForward 事業者 ID",
  },
  // ----- AI (Claude API、任意) -----
  {
    name: "ANTHROPIC_API_KEY",
    required: [],
    description:
      "Claude API キー (AI 返信 / 求人サジェスト用、未設定なら AI 機能のみ無効)",
  },
  // ----- 分析 -----
  {
    name: "NEXT_PUBLIC_GA_ID",
    required: ["production"],
    description: "Google Analytics 4 測定 ID (G-XXXXXXXXXX)",
    validate: (v) =>
      v.startsWith("G-") || "G- で始まる GA4 ID が必要",
  },
  {
    name: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
    required: [],
    description:
      "Google Search Console verification (HTML タグ方式、ファイルアップ方式なら不要)",
  },
  {
    name: "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY",
    required: [],
    description:
      "Google Maps API (求人 / 企業ページの地図表示用、未設定でも非表示で動作)",
  },
  // ----- Monitoring -----
  {
    name: "SENTRY_DSN",
    required: [],
    description:
      "Sentry エラー監視 (サーバー側)。本番では設定推奨",
  },
  {
    name: "NEXT_PUBLIC_SENTRY_DSN",
    required: [],
    description: "Sentry エラー監視 (クライアント側)。SENTRY_DSN と同値で OK",
  },
]

function loadDotenv(): Record<string, string> {
  const path = join(process.cwd(), ".env.local")
  if (!existsSync(path)) return {}
  const out: Record<string, string> = {}
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let value = trimmed.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    out[key] = value
  }
  return out
}

function main() {
  const args = process.argv.slice(2)
  const strict = args.includes("--strict")
  const envArg = args.find((a) => a.startsWith("--env="))
  const targetEnv = (envArg?.split("=")[1] ?? "local") as
    | "local"
    | "preview"
    | "production"

  // process.env を優先、無ければ .env.local
  const localFile = loadDotenv()
  const merged = { ...localFile, ...process.env }

  const errors: string[] = []
  const warnings: string[] = []
  const ok: string[] = []

  for (const def of ENV_DEFS) {
    const value = merged[def.name]
    const isRequired = def.required.includes(targetEnv)

    if (!value) {
      if (isRequired) {
        errors.push(`❌ ${def.name} が未設定 (必須 / ${def.description})`)
      } else {
        warnings.push(`⚠️  ${def.name} が未設定 (任意 / ${def.description})`)
      }
      continue
    }

    if (def.validate) {
      const result = def.validate(value)
      if (result !== true) {
        const msg = typeof result === "string" ? result : "validation failed"
        errors.push(`❌ ${def.name}: ${msg}`)
        continue
      }
    }

    ok.push(`✅ ${def.name}`)
  }

  console.log(`\n📋 環境変数チェック (target: ${targetEnv})\n`)
  for (const line of ok) console.log(line)
  if (warnings.length > 0) {
    console.log("")
    for (const line of warnings) console.log(line)
  }
  if (errors.length > 0) {
    console.log("")
    for (const line of errors) console.log(line)
  }

  console.log(
    `\n結果: ok=${ok.length} warning=${warnings.length} error=${errors.length}`
  )

  if (errors.length > 0 || (strict && warnings.length > 0)) {
    process.exit(1)
  }
}

main()
