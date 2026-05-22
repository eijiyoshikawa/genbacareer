-- ================================================================
-- 本番 DB 復旧用 SQL (PR #140 マージで追加された新規スキーマ反映)
--
-- 使い方:
--   1. Supabase Dashboard → 該当プロジェクト → 左メニュー "SQL Editor"
--   2. "+ New query" でこのファイル全文をコピペ
--   3. 右下の [Run] (Cmd+Enter) をクリック
--   4. 「Success. No rows returned.」が出れば完了
--
-- すべて冪等 (IF NOT EXISTS 付き)。何度実行しても安全。
-- データ消失は起きません。
-- ================================================================

-- ----------------------------------------------------------------
-- 2.6 求職ステータス: User に job_search_status カラム追加
-- ----------------------------------------------------------------
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "job_search_status" VARCHAR(20) NOT NULL DEFAULT 'searching';

-- ----------------------------------------------------------------
-- 17.3 ブロック企業 / NG キーワード設定
-- ----------------------------------------------------------------
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "blocked_company_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "blocked_keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- ----------------------------------------------------------------
-- 3.4 通知頻度・時間帯設定
-- ----------------------------------------------------------------
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ----------------------------------------------------------------
-- 14.5 オンライン面接 URL
-- ----------------------------------------------------------------
ALTER TABLE "applications"
  ADD COLUMN IF NOT EXISTS "interview_url" VARCHAR(500);

-- ----------------------------------------------------------------
-- 8.4 重複求人検出
-- ----------------------------------------------------------------
ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "dedupe_key" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "deduped_to" UUID;
CREATE INDEX IF NOT EXISTS "idx_jobs_dedupe_key"
  ON "jobs" ("dedupe_key");

-- ----------------------------------------------------------------
-- 15.6 採用決定ボーナス
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "hiring_bonuses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "application_id" UUID NOT NULL UNIQUE,
  "user_id" UUID NOT NULL,
  "company_id" UUID NOT NULL,
  "amount" INTEGER NOT NULL,
  "payout_method" VARCHAR(30) NOT NULL,
  "payout_details" JSONB,
  "status" VARCHAR(20) NOT NULL DEFAULT 'requested',
  "request_note" TEXT,
  "approved_at" TIMESTAMPTZ,
  "approved_by" UUID,
  "paid_at" TIMESTAMPTZ,
  "paid_by" UUID,
  "rejected_at" TIMESTAMPTZ,
  "rejection_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_hiring_bonuses_status"
  ON "hiring_bonuses" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_hiring_bonuses_user"
  ON "hiring_bonuses" ("user_id", "created_at" DESC);

-- ----------------------------------------------------------------
-- 12.2 企業口コミ・レビュー
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "company_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "company_id" UUID NOT NULL,
  "user_id" UUID,
  "employment_status" VARCHAR(20) NOT NULL,
  "rating" INTEGER NOT NULL,
  "rating_salary" INTEGER,
  "rating_work_life" INTEGER,
  "rating_growth" INTEGER,
  "rating_benefits" INTEGER,
  "title" VARCHAR(200),
  "good_points" TEXT,
  "bad_points" TEXT,
  "advice" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
  "display_name" VARCHAR(50),
  "reporter_ip" VARCHAR(45),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "moderated_at" TIMESTAMPTZ,
  "moderated_by" UUID,
  "moderation_note" VARCHAR(500),
  CONSTRAINT "company_reviews_company_fkey" FOREIGN KEY ("company_id")
    REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_company_reviews_by_company"
  ON "company_reviews" ("company_id", "status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_company_reviews_moderation"
  ON "company_reviews" ("status", "created_at" DESC);

-- ----------------------------------------------------------------
-- 12.3 気になる (ライト応募)
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "job_interests" (
  "user_id" UUID NOT NULL,
  "job_id" UUID NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "seen_by_company_at" TIMESTAMPTZ,
  PRIMARY KEY ("user_id", "job_id"),
  CONSTRAINT "job_interests_user_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE,
  CONSTRAINT "job_interests_job_fkey" FOREIGN KEY ("job_id")
    REFERENCES "jobs"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "idx_job_interests_by_job"
  ON "job_interests" ("job_id", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_job_interests_by_user"
  ON "job_interests" ("user_id", "created_at" DESC);

-- ----------------------------------------------------------------
-- 8.1 除外キーワード GUI 管理
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "blocklists" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "keyword" VARCHAR(100) NOT NULL,
  "scope" VARCHAR(20) NOT NULL DEFAULT 'any',
  "note" VARCHAR(500),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "hit_count" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "created_by" UUID
);
CREATE INDEX IF NOT EXISTS "idx_blocklist_enabled_scope"
  ON "blocklists" ("enabled", "scope");

-- ----------------------------------------------------------------
-- 6.2 通報・レポート
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "reports" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "target_type" VARCHAR(20) NOT NULL,
  "target_id" UUID NOT NULL,
  "reporter_id" UUID,
  "reporter_ip" VARCHAR(45),
  "reason" VARCHAR(100) NOT NULL,
  "detail" TEXT,
  "status" VARCHAR(20) NOT NULL DEFAULT 'open',
  "resolved_at" TIMESTAMPTZ,
  "resolved_by" UUID,
  "resolution" VARCHAR(500),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "reports_reporter_fkey" FOREIGN KEY ("reporter_id")
    REFERENCES "users"("id") ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "idx_reports_status_time"
  ON "reports" ("status", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_reports_target"
  ON "reports" ("target_type", "target_id");

-- ----------------------------------------------------------------
-- 7.1 クローラ求人カテゴリ分類
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "job_category_classifications" (
  "job_id" UUID NOT NULL PRIMARY KEY,
  "industry" VARCHAR(50) NOT NULL,
  "occupation" VARCHAR(50) NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "classified_by" VARCHAR(20) NOT NULL,
  "classified_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_job_classification"
  ON "job_category_classifications" ("industry", "occupation");

-- ----------------------------------------------------------------
-- 7.2 クローラ差分同期チェックポイント
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "crawler_sync_checkpoints" (
  "source" VARCHAR(50) NOT NULL PRIMARY KEY,
  "last_synced_at" TIMESTAMPTZ NOT NULL,
  "last_cursor" VARCHAR(200),
  "total_imported" INTEGER NOT NULL DEFAULT 0,
  "total_updated" INTEGER NOT NULL DEFAULT 0,
  "total_skipped" INTEGER NOT NULL DEFAULT 0,
  "total_errors" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------
-- 9.6 Search Console スナップショット
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "search_console_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "date" DATE NOT NULL,
  "query" VARCHAR(200) NOT NULL,
  "page" VARCHAR(500) NOT NULL,
  "clicks" INTEGER NOT NULL,
  "impressions" INTEGER NOT NULL,
  "ctr" DOUBLE PRECISION NOT NULL,
  "position" DOUBLE PRECISION NOT NULL,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_gsc_dimensions"
  ON "search_console_snapshots" ("date", "query", "page");
CREATE INDEX IF NOT EXISTS "idx_gsc_top"
  ON "search_console_snapshots" ("date" DESC, "clicks" DESC);

-- ----------------------------------------------------------------
-- 9.7 AI 生成記事
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ai_generated_articles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "slug" VARCHAR(200) NOT NULL UNIQUE,
  "topic" VARCHAR(200) NOT NULL,
  "prompt" TEXT NOT NULL,
  "body_markdown" TEXT NOT NULL,
  "status" VARCHAR(20) NOT NULL DEFAULT 'draft',
  "published_at" TIMESTAMPTZ,
  "related_job_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "model_name" VARCHAR(50),
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_ai_articles_status"
  ON "ai_generated_articles" ("status", "published_at" DESC);

-- ----------------------------------------------------------------
-- 13.4 アナリティクスイベント
-- ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "analytics_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  "user_id" UUID,
  "session_id" VARCHAR(50),
  "name" VARCHAR(50) NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "idx_analytics_name_time"
  ON "analytics_events" ("name", "created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_analytics_user_time"
  ON "analytics_events" ("user_id", "created_at" DESC);

-- ----------------------------------------------------------------
-- 反映確認用 (実行結果に各テーブル/カラムが見えれば成功)
-- ----------------------------------------------------------------
SELECT 'users.job_search_status' AS check_target,
       column_default
  FROM information_schema.columns
 WHERE table_name = 'users' AND column_name = 'job_search_status';

SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN (
     'reports',
     'job_category_classifications',
     'crawler_sync_checkpoints',
     'search_console_snapshots',
     'ai_generated_articles',
     'analytics_events'
   )
 ORDER BY table_name;
