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

## 【恒久ルール・厳守】デプロイ再トリガーに関する禁止事項

> 背景: 空コミットを数時間おきに自動 push して Vercel のデプロイを再トリガーしたことが
> GitHub の不正検知 (abuse detection) に抵触し、アカウントがフラグされた実績がある (2026-08)。

1. **空コミット禁止**: `git commit --allow-empty` や、内容のないダミーコミット・コメントだけ変えた
   再トリガー用コミットによるデプロイの再実行は絶対にしない。
2. **自動コミット生成の禁止**: cron・スクリプト・ループ・Routine 等で、コミットや push を
   定期的・自動的に生成する仕組みを作らない。
3. **コミットは実変更があるときのみ**: 実際のコード・ドキュメント変更があるときのみコミットする。
4. **デプロイの再実行が必要な場合は、必ず次のいずれかを使う**（GitHub を経由しない）:
   - Vercel Deploy Hook（Settings → Git → Deploy Hooks で発行した URL に `curl -X POST`）
   - Vercel ダッシュボードの Redeploy ボタン
   - Vercel CLI（`vercel --prod`）
5. このルールは他リポジトリ（slack_let / agents 等）でも同様に適用する。
