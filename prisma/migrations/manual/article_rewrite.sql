-- ============================================================================
-- 記事 SEO 自動リライト基盤のスキーマ。
--
-- 用途:
--   GSC（Search Console）データに基づき「表示回数は多いが CTR/順位が低い」
--   記事を 3 日に 1 回・上位 3 本リライトして PV を改善する自動化
--   （src/lib/article-rewrite.ts + /api/cron/article-rewrite）。
--
-- 内容:
--   1) articles に自動リライトのクールダウン/回数管理カラムを追加
--   2) 改稿前の本文・メタを退避する版履歴テーブル article_revisions を追加
--      （完全自動公開でも安全にロールバックできるようにする）
--
-- 実行方法（本番 / Session 接続）:
--   psql "$SESSION_URL" -f prisma/migrations/manual/article_rewrite.sql
--
-- 冪等性: ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS のため何度でも安全。
-- ============================================================================

-- 1) クールダウン・回数管理カラム
ALTER TABLE "articles"
  ADD COLUMN IF NOT EXISTS "last_rewritten_at" TIMESTAMPTZ;
ALTER TABLE "articles"
  ADD COLUMN IF NOT EXISTS "rewrite_count" INTEGER NOT NULL DEFAULT 0;

-- 2) 版履歴テーブル（改稿"前"のスナップショット）
CREATE TABLE IF NOT EXISTS "article_revisions" (
  "id"               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "article_id"       UUID NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
  "title"            VARCHAR(200) NOT NULL,
  "body"             TEXT NOT NULL,
  "excerpt"          VARCHAR(500),
  "meta_description" VARCHAR(300),
  "source"           VARCHAR(30) NOT NULL DEFAULT 'auto-rewrite',
  "reason"           VARCHAR(500),
  "model_name"       VARCHAR(50),
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_article_revisions"
  ON "article_revisions" ("article_id", "created_at" DESC);

-- 新規テーブルは postgres 所有。RLS 方針（public 全テーブル RLS 有効）に合わせる。
ALTER TABLE "article_revisions" ENABLE ROW LEVEL SECURITY;
