-- 求人一覧の表示順優先度カラム + インデックス追加。
--
-- ティア:
--   1: source='direct'（手入力求人）
--   2: 月給制で必須明示 9 項目すべて埋まる
--   3: その他の月給制求人
--   4: 時給制 / 日給制
--   5: その他（年俸 / null 等）
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/jobs_display_priority.sql
--
-- 既存求人は全て default=5 で入る。本 SQL 実行後、
-- scripts/backfill-job-display-priority.ts --apply で正しい値にバックフィルする。
--
-- 備考:
--   - ADD COLUMN ... DEFAULT 5 は PostgreSQL 11+ では即座に完了（テーブル書き換え無し）
--   - CREATE INDEX CONCURRENTLY は他セッションをブロックしない
--   - prisma db push でも同じカラム / インデックスが宣言されるため、
--     新規環境では本 SQL は不要

SET lock_timeout = '30s';
SET statement_timeout = '0';

-- 1) カラム追加（即時完了）
ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS display_priority INTEGER NOT NULL DEFAULT 5;

-- 2) ソート用インデックス（CONCURRENTLY でオンライン構築、~10 万件で数秒）
--    すでに idx_jobs_status_rank があるので、これを補完する形で priority を主に。
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_jobs_status_priority_rank
  ON jobs (status, display_priority, rank_score DESC, published_at DESC);
