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

## 定期バグ検査ルーティンでの確認事項
「バグがないか確認・修正して」系のタスク（定期実行含む）では、通常のビルド/lint/test/本番ログ確認に加えて、以下も毎回チェックする:

- **非建設業求人の混入防止**（本サイトは建設業 9 カテゴリ固定のため最重要）
  - `src/lib/crawler/import-batch.ts` の `inferCategory` が `src/lib/categories.ts` の
    `CATEGORIES`（9 カテゴリ）以外にマップしていないか。新しい求人ソース（クローラ/フィード連携）を
    追加する際は必ず `inferCategory` 相当の絞り込みを通すこと（絞り込まず生投入しない）
  - 新しい求人一覧・検索系のコード（`/jobs` 系ページ、`/api/jobs` 系 API、サイトマップ等）を追加・変更
    する際は `CONSTRUCTION_CATEGORY_VALUES`（`src/lib/categories.ts`）で `category` を絞り込んでいるか
    （保険のフィルタ。既存 27 ファイルが参照 — 新規箇所も同じパターンに揃える）
  - 企業による求人投稿 API（`/api/company/jobs`）が `CATEGORIES` の値以外を弾いているか
  - 可能であれば本番 DB で `SELECT category, COUNT(*) FROM jobs GROUP BY category` 相当を確認し、
    9 カテゴリ以外（またはタイトルが明らかに建設業と無関係）の行が無いか確認する
- **未マージ PR の滞留**: `claude/stoic-johnson-*` ブランチの定期バグ検査 PR が open のまま
  滞留していないか確認する。滞留している場合は、その PR が既に main に取り込まれているかを
  必ず個別に検証してから新規 PR を作ること（重複修正や、既にサイズの大きくなった main との
  コンフリクトを避けるため）。
