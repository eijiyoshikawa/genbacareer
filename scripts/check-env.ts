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
  // ----- Site -----
  {
    name: "NEXT_PUBLIC_BASE_URL",
    required: ["preview", "production"],
    description: "サイトの本番 URL (sitemap / OGP / 構造化データに使用)",
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
  // ----- 外部サービス -----
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
  {
    name: "LINE_CHANNEL_ID",
    required: ["production"],
    description: "LINE Messaging API",
  },
  {
    name: "LINE_CHANNEL_SECRET",
    required: ["production"],
    description: "LINE Messaging API",
  },
  {
    name: "LINE_CHANNEL_ACCESS_TOKEN",
    required: ["production"],
    description: "LINE Messaging API",
  },
  {
    name: "STRIPE_SECRET_KEY",
    required: [],
    description:
      "Stripe API (成果報酬を Stripe Invoicing で発行する場合のみ。MoneyForward 一本ならスキップ可)",
    validate: (v) =>
      v.startsWith("sk_") || "sk_ で始まる Stripe Secret Key",
  },
  {
    name: "STRIPE_WEBHOOK_SECRET",
    required: [],
    description:
      "Stripe Webhook 認証 (STRIPE_SECRET_KEY を使う場合は必須)",
  },
  // ----- 分析 -----
  {
    name: "NEXT_PUBLIC_GA_ID",
    required: [],
    description: "Google Analytics 4 測定 ID (G-XXXXXXXXXX)",
  },
  {
    name: "NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION",
    required: [],
    description: "Google Search Console verification (HTML タグ方式)",
  },
  // ----- Monitoring -----
  {
    name: "SENTRY_DSN",
    required: [],
    description: "Sentry エラー監視 (必須ではないが本番では設定推奨)",
  },
  // ----- PWA -----
  {
    name: "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
    required: [],
    description: "Web Push 通知（PWA） — 未設定なら無効",
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
