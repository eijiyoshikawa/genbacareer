# 記事シードデータ

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `article-plans.ts` | 199 記事の企画マスターデータ（slug, title, category, tags, excerpt） |
| `generate-articles-sql.ts` | `article-plans.ts` から `articles.sql` を生成するスクリプト |
| `articles.sql` | 上記スクリプトで生成される SQL INSERT 文（Supabase に直接投入） |
| `seed-articles.ts` | Prisma 経由で投入するスクリプト（ローカル実行用） |
| `articles/*.html` | 重要記事の本文を Git 管理する用 |

## 運用方法（推奨：SQL Editor で一括投入）

Vercel Functions のタイムアウトを回避するため、200記事のような大量投入は **Supabase SQL Editor で直接実行する** のが最も安全です。

### 初回投入手順

1. **SQL を再生成（必要なら）**
   ```bash
   pnpm dlx tsx prisma/seed-data/generate-articles-sql.ts 2>/dev/null > prisma/seed-data/articles.sql
   ```

2. **Supabase ダッシュボードを開く**
   - プロジェクトを開く
   - 左メニュー「SQL Editor」を選択

3. **`articles.sql` の中身をコピペ**
   - このファイルの内容を全選択してコピー
   - SQL Editor にペースト

4. **「Run」ボタンをクリック**
   - `ON CONFLICT (slug) DO NOTHING` があるので、既存記事はスキップされ安全
   - 数秒〜数十秒で完了

5. **記事一覧で確認**
   - `/admin/articles` を開いて 199 件登録されていることを確認

### 既存記事を上書きしたい場合

`ON CONFLICT DO NOTHING` 箇所を `ON CONFLICT (slug) DO UPDATE SET ...` に書き換えるか、先に該当記事を削除してから再実行してください。

## SQL 生成スクリプトの仕様

- 公開日（`published_at`）: 2026/1/1 09:00 JST を起点に 1日1記事のペースで自動設定
- ステータス: すべて `published`
- 注目記事: 先頭3件のみ `featured = true`
- 著者名: `ゲンバキャリア編集部`
- 本文: プレースホルダー HTML（タイトル・抜粋・タグから自動生成）
- `image_url`: `NULL`（後で admin 画面から設定）

## 本文の差し替え

プレースホルダー本文は、admin 画面 `/admin/articles/[id]/edit` から1記事ずつ編集できます。

1リクエスト1記事なので Vercel Functions のタイムアウト（10秒）に余裕で収まります。
