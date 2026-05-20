# 求人ポータル — ノンデスク産業特化型求人サイト

## 技術スタック
- Next.js 16 (App Router) + TypeScript (strict mode)
- Tailwind CSS v4
- Prisma v6 + PostgreSQL (Supabase)
- NextAuth.js v5 (beta)
- Zod v4 (バリデーション)
- ファイルアップロード: Supabase Storage REST（SDK 不使用）
- メール送信: SendGrid（API キー未設定時は console.log にフォールバック）

## 設計ドキュメント
- アーキテクチャ: eijiyoshikawa/agents/agents/tech_lead/architecture_xwork_clone.json

## 開発ルール
- TypeScript strict モード必須
- Zod v4 を使用（issues ベースのエラー取得）
- Next.js 16 の params / searchParams は Promise（await 必須）
- パスエイリアス: `@/*` → `./src/*`

## コマンド
- `pnpm dev` — 開発サーバー起動
- `pnpm build` — プロダクションビルド
- `pnpm lint` — ESLint 実行
- `pnpm test` — Vitest 実行
- `pnpm prisma generate` — Prisma クライアント生成
- `pnpm prisma db push` — スキーマをDBに反映

## cron エンドポイント（Authorization: Bearer ${CRON_SECRET} 必須）
- `GET /api/cron/saved-search-alerts` — 保存条件に一致する新着求人をメール通知
- `GET /api/cron/close-expired-jobs` — `expiresAt` 経過の求人を closed に
