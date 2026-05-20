# 求人ポータル — 建設業界特化型求人サイト

## ブランド
- 名称: **ゲンバキャリア**（カタカナ表記。ロゴ・タイトル・本文すべてこの表記で統一）
- ドメイン: `genbacareer.jp`
- ターゲット業界: **建設業界に特化** (建築/躯体/土木/電気・設備/内装/解体産廃/施工管理/測量設計 + ドライバー・重機)
  - 他業界への拡張は行わない。`src/lib/categories.ts` の 9 カテゴリで固定運用

## 技術スタック
- Next.js 15 (App Router) + TypeScript (strict mode)
- Tailwind CSS v4
- Prisma v6 + PostgreSQL (Supabase)
- NextAuth.js v5 (beta)
- Zod v4 (バリデーション)

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
- `pnpm prisma generate` — Prisma クライアント生成
- `pnpm prisma db push` — スキーマをDBに反映
