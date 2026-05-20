import { prisma } from "./db"

// 本番 DB にスキーマ追加カラムが未反映の場合でもアプリが落ちないよう、
// 起動時に冪等な ALTER TABLE / CREATE INDEX を発行する。
// 通常運用では `prisma db push` 後すべて適用済みなので、
// IF NOT EXISTS によりほぼ no-op で完了する。
const STATEMENTS: ReadonlyArray<string> = [
 // User 求職ステータス (2.6): searching / employed_open / hired
 `ALTER TABLE "users"
   ADD COLUMN IF NOT EXISTS "job_search_status" VARCHAR(20) NOT NULL DEFAULT 'searching'`,
 // Company リッチコンテンツ + SNS
 `ALTER TABLE "companies"
 ADD COLUMN IF NOT EXISTS "tagline" VARCHAR(200),
 ADD COLUMN IF NOT EXISTS "pitch_highlights" TEXT,
 ADD COLUMN IF NOT EXISTS "ideal_candidate" TEXT,
 ADD COLUMN IF NOT EXISTS "employee_voice" TEXT,
 ADD COLUMN IF NOT EXISTS "photos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
 ADD COLUMN IF NOT EXISTS "instagram_url" VARCHAR(500),
 ADD COLUMN IF NOT EXISTS "tiktok_url" VARCHAR(500),
 ADD COLUMN IF NOT EXISTS "facebook_url" VARCHAR(500),
 ADD COLUMN IF NOT EXISTS "x_url" VARCHAR(500),
 ADD COLUMN IF NOT EXISTS "youtube_url" VARCHAR(500),
 ADD COLUMN IF NOT EXISTS "last_content_updated_at" TIMESTAMPTZ`,
 // Job 並び順スコア
 `ALTER TABLE "jobs"
 ADD COLUMN IF NOT EXISTS "rank_score" INTEGER NOT NULL DEFAULT 0`,
 `CREATE INDEX IF NOT EXISTS "idx_jobs_status_rank"
 ON "jobs" ("status", "rank_score" DESC, "published_at" DESC)`,
 // LINE ミニフォームから生まれるリード（氏名/電話/メール 必須 + LINE 紐付け後追い）
 `CREATE TABLE IF NOT EXISTS "line_leads" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "job_id" UUID,
   "name" VARCHAR(100) NOT NULL,
   "phone" VARCHAR(30) NOT NULL,
   "email" VARCHAR(255) NOT NULL,
   "prefecture" VARCHAR(10),
   "experience_years" INTEGER,
   "notes" TEXT,
   "line_user_id" VARCHAR(50),
   "line_display_name" VARCHAR(100),
   "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
   "ip_address" VARCHAR(45),
   "user_agent" VARCHAR(500),
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   CONSTRAINT "line_leads_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE SET NULL
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_line_leads_job" ON "line_leads" ("job_id", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_line_leads_line_user" ON "line_leads" ("line_user_id")`,
 `CREATE INDEX IF NOT EXISTS "idx_line_leads_status" ON "line_leads" ("status", "created_at" DESC)`,
 // PR #37: 流入・閲覧トラッキング列
 `ALTER TABLE "application_clicks" ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(50)`,
 `ALTER TABLE "line_leads"
    ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(50),
    ADD COLUMN IF NOT EXISTS "utm_source" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "utm_medium" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "utm_campaign" VARCHAR(100),
    ADD COLUMN IF NOT EXISTS "referer" VARCHAR(500)`,
 `CREATE INDEX IF NOT EXISTS "idx_line_leads_session" ON "line_leads" ("session_id")`,
 `CREATE TABLE IF NOT EXISTS "job_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "job_id" UUID NOT NULL,
    "session_id" VARCHAR(50),
    "user_id" UUID,
    "ip_address" VARCHAR(45),
    "user_agent" VARCHAR(500),
    "referer" VARCHAR(500),
    "utm_source" VARCHAR(100),
    "utm_medium" VARCHAR(100),
    "utm_campaign" VARCHAR(100),
    "viewed_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "job_views_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE,
    CONSTRAINT "job_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
  )`,
 `CREATE INDEX IF NOT EXISTS "idx_job_views_job_time" ON "job_views" ("job_id", "viewed_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_job_views_session_time" ON "job_views" ("session_id", "viewed_at" DESC)`,
 // PR #40: BroadcastLog
 `CREATE TABLE IF NOT EXISTS "broadcast_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    "segment" JSONB NOT NULL,
    "job_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
    "free_text" TEXT,
    "target_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "triggered_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,
 `CREATE INDEX IF NOT EXISTS "idx_broadcast_logs_time" ON "broadcast_logs" ("created_at" DESC)`,
 // PR #43: オプトアウト管理
 `ALTER TABLE "line_leads"
    ADD COLUMN IF NOT EXISTS "opted_out" BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS "opted_out_at" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "opted_out_source" VARCHAR(20)`,
 `CREATE INDEX IF NOT EXISTS "idx_line_leads_opted_out" ON "line_leads" ("opted_out")`,
 // pg_trgm: 求人 q 検索の類似度ベース高速化（lib/job-search.ts が利用）
 // CREATE EXTENSION は superuser 権限が必要だが Supabase なら通る。
 // 失敗してもループ全体は止まらず、後段の CREATE INDEX のみ警告で skip される。
 `CREATE EXTENSION IF NOT EXISTS pg_trgm`,
 `CREATE INDEX IF NOT EXISTS "idx_jobs_title_trgm" ON "jobs" USING GIN (title gin_trgm_ops)`,
 `CREATE INDEX IF NOT EXISTS "idx_jobs_description_trgm" ON "jobs" USING GIN (description gin_trgm_ops)`,
 `CREATE INDEX IF NOT EXISTS "idx_companies_name_trgm" ON "companies" USING GIN (name gin_trgm_ops)`,
 // PR #88: User BAN / 退会 / 規約同意
 `ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS "suspended_at" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "suspended_reason" VARCHAR(500),
    ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "terms_accepted_at" TIMESTAMPTZ`,
 `CREATE INDEX IF NOT EXISTS "idx_users_status" ON "users" ("status")`,
 // PR #88: 求人の自動再掲載期限
 `ALTER TABLE "jobs"
    ADD COLUMN IF NOT EXISTS "expires_at" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "auto_renew" BOOLEAN NOT NULL DEFAULT false`,
 `CREATE INDEX IF NOT EXISTS "idx_jobs_expires_at" ON "jobs" ("expires_at") WHERE status = 'active'`,
 // PR #88: 応募取り消し（status enum 拡張）— status は VARCHAR なので DDL 不要、
 // アプリ層のバリデーションのみで担保。
 // 法人番号 / GbizINFO API 連携準備
 `ALTER TABLE "companies"
    ADD COLUMN IF NOT EXISTS "corporate_number" VARCHAR(13),
    ADD COLUMN IF NOT EXISTS "gbiz_synced_at" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "gbiz_data" JSONB`,
 `CREATE UNIQUE INDEX IF NOT EXISTS "idx_companies_corporate_number"
    ON "companies" ("corporate_number") WHERE "corporate_number" IS NOT NULL`,
 // 検索ログ (C3: /admin/search-logs で可視化)
 `CREATE TABLE IF NOT EXISTS "search_logs" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "query" VARCHAR(200),
   "prefecture" VARCHAR(20),
   "category" VARCHAR(50),
   "result_count" INTEGER NOT NULL,
   "session_id" VARCHAR(50),
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_search_logs_time"
    ON "search_logs" ("created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_search_logs_query"
    ON "search_logs" ("query", "created_at" DESC)
    WHERE "query" IS NOT NULL`,
 // 通報・レポート (6.2)
 `CREATE TABLE IF NOT EXISTS "reports" (
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
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_reports_status_time"
    ON "reports" ("status", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_reports_target"
    ON "reports" ("target_type", "target_id")`,
 // クローラ求人カテゴリ分類 (7.1)
 `CREATE TABLE IF NOT EXISTS "job_category_classifications" (
   "job_id" UUID NOT NULL PRIMARY KEY,
   "industry" VARCHAR(50) NOT NULL,
   "occupation" VARCHAR(50) NOT NULL,
   "confidence" DOUBLE PRECISION NOT NULL,
   "classified_by" VARCHAR(20) NOT NULL,
   "classified_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_job_classification"
    ON "job_category_classifications" ("industry", "occupation")`,
 // クローラ差分同期チェックポイント (7.2)
 `CREATE TABLE IF NOT EXISTS "crawler_sync_checkpoints" (
   "source" VARCHAR(50) NOT NULL PRIMARY KEY,
   "last_synced_at" TIMESTAMPTZ NOT NULL,
   "last_cursor" VARCHAR(200),
   "total_imported" INTEGER NOT NULL DEFAULT 0,
   "total_updated" INTEGER NOT NULL DEFAULT 0,
   "total_skipped" INTEGER NOT NULL DEFAULT 0,
   "total_errors" INTEGER NOT NULL DEFAULT 0,
   "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 // Search Console スナップショット (9.6)
 `CREATE TABLE IF NOT EXISTS "search_console_snapshots" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "date" DATE NOT NULL,
   "query" VARCHAR(200) NOT NULL,
   "page" VARCHAR(500) NOT NULL,
   "clicks" INTEGER NOT NULL,
   "impressions" INTEGER NOT NULL,
   "ctr" DOUBLE PRECISION NOT NULL,
   "position" DOUBLE PRECISION NOT NULL,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE UNIQUE INDEX IF NOT EXISTS "uniq_gsc_dimensions"
    ON "search_console_snapshots" ("date", "query", "page")`,
 `CREATE INDEX IF NOT EXISTS "idx_gsc_top"
    ON "search_console_snapshots" ("date" DESC, "clicks" DESC)`,
 // AI 生成記事 (9.7)
 `CREATE TABLE IF NOT EXISTS "ai_generated_articles" (
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
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_ai_articles_status"
    ON "ai_generated_articles" ("status", "published_at" DESC)`,
 // アナリティクスイベント (13.4)
 `CREATE TABLE IF NOT EXISTS "analytics_events" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "user_id" UUID,
   "session_id" VARCHAR(50),
   "name" VARCHAR(50) NOT NULL,
   "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_analytics_name_time"
    ON "analytics_events" ("name", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_analytics_user_time"
    ON "analytics_events" ("user_id", "created_at" DESC)`,
]

let inflight: Promise<boolean> | null = null

// 一度だけ実行され、結果を Promise でキャッシュ。成功/失敗いずれも以後 await が即解決する。
// 戻り値: 全 ALTER が成功したかどうか（失敗時は防御クエリへフォールバック判断に使う）。
//
// pg_trgm のように権限不足で失敗しうる文があるため、各 SQL は個別 try/catch。
// 1 つ落ちても残りは適用される。
//
// Vercel の build フェーズ (`NEXT_PHASE=phase-production-build`) ではスキップする。
// build 時の prerender で複数 worker が並列に ensureSchema を呼ぶと、
// connection_limit=1 環境で P2024 (接続プール枯渇) を多発させてビルド失敗するため。
// 本番起動時 (request 処理時) には通常通り走るので DB 反映は問題ない。
export function ensureSchema(): Promise<boolean> {
 if (process.env.NEXT_PHASE === "phase-production-build") {
   return Promise.resolve(true)
 }
 if (!inflight) {
 inflight = (async () => {
 let allOk = true
 for (const sql of STATEMENTS) {
 try {
 await prisma.$executeRawUnsafe(sql)
 } catch (e) {
 allOk = false
 console.warn(
 "[ensureSchema] statement skipped:",
 e instanceof Error ? e.message : e
 )
 }
 }
 return allOk
 })()
 }
 return inflight
}
