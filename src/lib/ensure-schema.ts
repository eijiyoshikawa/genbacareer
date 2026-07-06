import { prisma } from "./db"

// 本番 DB にスキーマ追加カラムが未反映の場合でもアプリが落ちないよう、
// 起動時に冪等な ALTER TABLE / CREATE INDEX を発行する。
// 通常運用では `prisma db push` 後すべて適用済みなので、
// IF NOT EXISTS によりほぼ no-op で完了する。
const STATEMENTS: ReadonlyArray<string> = [
 // User 求職ステータス (2.6): searching / employed_open / hired
 `ALTER TABLE "users"
   ADD COLUMN IF NOT EXISTS "job_search_status" VARCHAR(20) NOT NULL DEFAULT 'searching'`,
 // User ブロック企業 / NG キーワード (17.3)
 `ALTER TABLE "users"
   ADD COLUMN IF NOT EXISTS "blocked_company_ids" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
   ADD COLUMN IF NOT EXISTS "blocked_keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`,
 // User 通知頻度・時間帯設定 (3.4)
 `ALTER TABLE "users"
   ADD COLUMN IF NOT EXISTS "notification_prefs" JSONB NOT NULL DEFAULT '{}'::jsonb`,
 // Application オンライン面接 URL (14.5)
 `ALTER TABLE "applications"
   ADD COLUMN IF NOT EXISTS "interview_url" VARCHAR(500)`,
 // Application Google Calendar イベント ID (14.4)
 `ALTER TABLE "applications"
   ADD COLUMN IF NOT EXISTS "google_calendar_event_id" VARCHAR(200)`,
 // admin 企業一覧 / 応募集計の高速化用 index (本番でテーブル既存の場合用)
 `CREATE INDEX IF NOT EXISTS "idx_applications_by_company"
    ON "applications" ("company_id", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_applications_by_user"
    ON "applications" ("user_id", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_applications_by_status"
    ON "applications" ("status", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_companies_admin_list"
    ON "companies" ("source", "status", "created_at" DESC)`,
 // Google Calendar OAuth トークン保管 (14.4)
 `CREATE TABLE IF NOT EXISTS "company_calendar_oauth" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "company_id" UUID NOT NULL UNIQUE,
   "email" VARCHAR(255) NOT NULL,
   "refresh_token" TEXT NOT NULL,
   "access_token" TEXT,
   "token_expires_at" TIMESTAMPTZ,
   "scope" VARCHAR(500) NOT NULL DEFAULT '',
   "calendar_id" VARCHAR(200) NOT NULL DEFAULT 'primary',
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 // Job 重複求人検出 (8.4)
 `ALTER TABLE "jobs"
   ADD COLUMN IF NOT EXISTS "dedupe_key" VARCHAR(64),
   ADD COLUMN IF NOT EXISTS "deduped_to" UUID`,
 // 求人ごとの写真（先頭がヒーロー、以降はギャラリー）
 `ALTER TABLE "jobs"
   ADD COLUMN IF NOT EXISTS "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`,
 `CREATE INDEX IF NOT EXISTS "idx_jobs_dedupe_key"
    ON "jobs" ("dedupe_key")`,
 // 採用決定ボーナス (15.6)
 `CREATE TABLE IF NOT EXISTS "hiring_bonuses" (
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
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_hiring_bonuses_status"
    ON "hiring_bonuses" ("status", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_hiring_bonuses_user"
    ON "hiring_bonuses" ("user_id", "created_at" DESC)`,
 // 企業口コミ・レビュー (12.2)
 `CREATE TABLE IF NOT EXISTS "company_reviews" (
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
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_company_reviews_by_company"
    ON "company_reviews" ("company_id", "status", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_company_reviews_moderation"
    ON "company_reviews" ("status", "created_at" DESC)`,
 // 気になる - ライト応募 (12.3)
 `CREATE TABLE IF NOT EXISTS "job_interests" (
   "user_id" UUID NOT NULL,
   "job_id" UUID NOT NULL,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   "seen_by_company_at" TIMESTAMPTZ,
   PRIMARY KEY ("user_id", "job_id"),
   CONSTRAINT "job_interests_user_fkey" FOREIGN KEY ("user_id")
     REFERENCES "users"("id") ON DELETE CASCADE,
   CONSTRAINT "job_interests_job_fkey" FOREIGN KEY ("job_id")
     REFERENCES "jobs"("id") ON DELETE CASCADE
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_job_interests_by_job"
    ON "job_interests" ("job_id", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_job_interests_by_user"
    ON "job_interests" ("user_id", "created_at" DESC)`,
 // 除外キーワード (8.1)
 `CREATE TABLE IF NOT EXISTS "blocklists" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "keyword" VARCHAR(100) NOT NULL,
   "scope" VARCHAR(20) NOT NULL DEFAULT 'any',
   "note" VARCHAR(500),
   "enabled" BOOLEAN NOT NULL DEFAULT true,
   "hit_count" INTEGER NOT NULL DEFAULT 0,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   "created_by" UUID
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_blocklist_enabled_scope"
    ON "blocklists" ("enabled", "scope")`,
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
 // プロフィール公開の既定値を ON に（スカウト受信の前提。新規登録時に適用）
 `ALTER TABLE "users" ALTER COLUMN "profile_public" SET DEFAULT true`,
 // 認証トークン列（パスワードリセット / メールアドレス確認）。
 // schema.prisma 定義のみで ensureSchema 未収録だったため、db push 未適用の
 // 本番で reset/verify フロー（forgot-password・signup 確認メール）が
 // P2022「column does not exist」で 500 になっていた。冪等に補完する。
 `ALTER TABLE "users"
    ADD COLUMN IF NOT EXISTS "email_verified" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "verification_token" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "verification_token_expiry" TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS "reset_token" VARCHAR(64),
    ADD COLUMN IF NOT EXISTS "reset_token_expiry" TIMESTAMPTZ`,
 // @unique 相当の一意 index（Prisma 既定名に合わせ db push と整合させる）
 `CREATE UNIQUE INDEX IF NOT EXISTS "users_verification_token_key"
    ON "users" ("verification_token")`,
 `CREATE UNIQUE INDEX IF NOT EXISTS "users_reset_token_key"
    ON "users" ("reset_token")`,
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
 // 注意: ここは partial index (WHERE query IS NOT NULL) にしないこと。
 // schema.prisma の @@index は partial を表現できず、`prisma db push` が
 // この index を「未作成」と誤認して同名作成を試み "already exists" で失敗する
 // (2026-06 の db push 障害の原因)。schema.prisma と定義を完全一致させる。
 `CREATE INDEX IF NOT EXISTS "idx_search_logs_query"
    ON "search_logs" ("query", "created_at" DESC)`,
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
 // 記事 SEO 自動リライト: クールダウン管理カラム + 版履歴テーブル
 `ALTER TABLE "articles"
    ADD COLUMN IF NOT EXISTS "last_rewritten_at" TIMESTAMPTZ`,
 `ALTER TABLE "articles"
    ADD COLUMN IF NOT EXISTS "rewrite_count" INTEGER NOT NULL DEFAULT 0`,
 `CREATE TABLE IF NOT EXISTS "article_revisions" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "article_id" UUID NOT NULL REFERENCES "articles"("id") ON DELETE CASCADE,
   "title" VARCHAR(200) NOT NULL,
   "body" TEXT NOT NULL,
   "excerpt" VARCHAR(500),
   "meta_description" VARCHAR(300),
   "source" VARCHAR(30) NOT NULL DEFAULT 'auto-rewrite',
   "reason" VARCHAR(500),
   "model_name" VARCHAR(50),
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_article_revisions"
    ON "article_revisions" ("article_id", "created_at" DESC)`,
 // 会社概要: 資本金・設立
 `ALTER TABLE "companies"
   ADD COLUMN IF NOT EXISTS "capital" VARCHAR(100),
   ADD COLUMN IF NOT EXISTS "founded_on" VARCHAR(100)`,
 // 利用者の声（体験談）CMS
 `CREATE TABLE IF NOT EXISTS "testimonials" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "quote" TEXT NOT NULL,
   "who" VARCHAR(120) NOT NULL,
   "published" BOOLEAN NOT NULL DEFAULT TRUE,
   "sort_order" INTEGER NOT NULL DEFAULT 0,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_testimonials_pub_order"
    ON "testimonials" ("published", "sort_order")`,
 // LINE 連携: 求職者 User に Messaging API userId を保持（全登録経路を LINE 到達可能にする）
 `ALTER TABLE "users"
   ADD COLUMN IF NOT EXISTS "line_user_id" VARCHAR(50)`,
 `CREATE INDEX IF NOT EXISTS "idx_users_line_user" ON "users" ("line_user_id")`,
 // LINE ダイジェスト配信: 通知の LINE Push 済みマーク
 `ALTER TABLE "notifications"
   ADD COLUMN IF NOT EXISTS "line_pushed_at" TIMESTAMPTZ`,
 // 未送信通知の絞り込み用（daily/weekly ダイジェスト cron）
 `CREATE INDEX IF NOT EXISTS "idx_notifications_line_pending"
    ON "notifications" ("created_at") WHERE "line_pushed_at" IS NULL`,
 // ========================================
 // ポイント制度 / 抽選 (2026-06 追加)
 // ※ 既存 DB の index drift で `prisma db push` が止まるため、
 //   ここで冪等 DDL を流して新規テーブルを確実に作成する。
 // ========================================
 // User 残高キャッシュ
 `ALTER TABLE "users"
   ADD COLUMN IF NOT EXISTS "point_balance" INTEGER NOT NULL DEFAULT 0`,
 // ポイント台帳（追記専用）
 `CREATE TABLE IF NOT EXISTS "point_ledgers" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
   "delta" INTEGER NOT NULL,
   "reason" VARCHAR(30) NOT NULL,
   "dedupe_key" VARCHAR(120),
   "ref_id" VARCHAR(64),
   "balance" INTEGER NOT NULL,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 // (user_id, dedupe_key) 一意 → 同一求人の同日二重付与を DB レベルで防止
 // (Postgres は NULL を distinct 扱いするため dedupe_key=NULL の消費系は衝突しない)
 `CREATE UNIQUE INDEX IF NOT EXISTS "uq_point_ledger_user_dedupe"
    ON "point_ledgers" ("user_id", "dedupe_key")`,
 `CREATE INDEX IF NOT EXISTS "idx_point_ledger_user_time"
    ON "point_ledgers" ("user_id", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_point_ledger_reason_time"
    ON "point_ledgers" ("reason", "created_at" DESC)`,
 // キャリア面談
 `CREATE TABLE IF NOT EXISTS "career_interviews" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
   "coordinator" VARCHAR(100),
   "status" VARCHAR(20) NOT NULL DEFAULT 'scheduled',
   "scheduled_at" TIMESTAMPTZ,
   "completed_at" TIMESTAMPTZ,
   "points_awarded" BOOLEAN NOT NULL DEFAULT false,
   "note" VARCHAR(1000),
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 // 面談相手の企業（同一企業での重複付与防止）
 `ALTER TABLE "career_interviews"
   ADD COLUMN IF NOT EXISTS "company_id" UUID,
   ADD COLUMN IF NOT EXISTS "company_name" VARCHAR(200)`,
 `CREATE INDEX IF NOT EXISTS "idx_career_interviews_user"
    ON "career_interviews" ("user_id", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_career_interviews_status"
    ON "career_interviews" ("status", "created_at" DESC)`,
 // 抽選景品マスタ
 `CREATE TABLE IF NOT EXISTS "lottery_prizes" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "name" VARCHAR(100) NOT NULL,
   "kind" VARCHAR(20) NOT NULL DEFAULT 'service_perk',
   "value_jpy" INTEGER NOT NULL DEFAULT 0,
   "weight" INTEGER NOT NULL DEFAULT 1,
   "stock" INTEGER,
   "active" BOOLEAN NOT NULL DEFAULT true,
   "sort_order" INTEGER NOT NULL DEFAULT 0,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
   "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_lottery_prizes_active"
    ON "lottery_prizes" ("active", "sort_order")`,
 // 抽選結果
 `CREATE TABLE IF NOT EXISTS "lottery_draws" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "user_id" UUID NOT NULL REFERENCES "users" ("id") ON DELETE CASCADE,
   "cost" INTEGER NOT NULL,
   "prize_id" UUID REFERENCES "lottery_prizes" ("id") ON DELETE SET NULL,
   "prize_name" VARCHAR(100) NOT NULL,
   "is_win" BOOLEAN NOT NULL,
   "fulfillment" VARCHAR(20) NOT NULL DEFAULT 'pending',
   "fulfilled_at" TIMESTAMPTZ,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE INDEX IF NOT EXISTS "idx_lottery_draws_user"
    ON "lottery_draws" ("user_id", "created_at" DESC)`,
 `CREATE INDEX IF NOT EXISTS "idx_lottery_draws_fulfillment"
    ON "lottery_draws" ("is_win", "fulfillment", "created_at" DESC)`,
 // ギフトコード在庫プール（当選時に自動割り当て＋LINE自動送付）
 `CREATE TABLE IF NOT EXISTS "gift_codes" (
   "id" UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
   "prize_id" UUID NOT NULL REFERENCES "lottery_prizes" ("id") ON DELETE CASCADE,
   "code" VARCHAR(255) NOT NULL,
   "status" VARCHAR(20) NOT NULL DEFAULT 'available',
   "draw_id" UUID UNIQUE,
   "assigned_user_id" UUID,
   "assigned_at" TIMESTAMPTZ,
   "delivered_via" VARCHAR(20),
   "delivered_at" TIMESTAMPTZ,
   "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW()
 )`,
 `CREATE UNIQUE INDEX IF NOT EXISTS "uq_gift_codes_prize_code"
    ON "gift_codes" ("prize_id", "code")`,
 `CREATE INDEX IF NOT EXISTS "idx_gift_codes_prize_status"
    ON "gift_codes" ("prize_id", "status")`,
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
//
// 本番運用ですでに `prisma db push` 済みの場合は `ENSURE_SCHEMA=false` を
// 環境変数に設定すると一切走らない (cold lambda の TTFB を改善する)。
// スキーマ変更を入れた直後は ENSURE_SCHEMA=true (or 未設定) で 1〜2 回走らせて
// 確実に反映させ、安定後に false にする運用が推奨。
export function ensureSchema(): Promise<boolean> {
 if (process.env.NEXT_PHASE === "phase-production-build") {
   return Promise.resolve(true)
 }
 // 本番安定後は env で完全スキップ可能 (TTFB 改善)
 if (process.env.ENSURE_SCHEMA === "false") {
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
