-- ============================================================================
-- reconcile-search-logs-index.sql
-- 2026-06: `prisma db push` が
--   Error: relation "idx_search_logs_query" already exists
-- で失敗する問題のワンタイム解消スクリプト。
--
-- 原因:
--   既存 DB の "idx_search_logs_query" は partial index (WHERE query IS NOT NULL)
--   として作られていたが、schema.prisma の @@index は partial を表現できないため、
--   Prisma が「未作成」と誤認 → 同名 CREATE を試みて衝突していた。
--
-- 対応:
--   partial index を削除し、schema.prisma / ensure-schema.ts と完全一致する
--   通常 index に作り直す。これにより以後 `prisma db push` はこの index について no-op になる。
--
-- 実行方法（どちらでも可・データ損失なし / index のみ）:
--   A) Supabase SQL Editor にこの内容を貼り付けて実行
--   B) psql "$DIRECT_URL" -f scripts/sql/reconcile-search-logs-index.sql
--
-- 実行後、アプリに 1 度アクセスすれば ensure-schema が冪等に再作成を保証する。
-- ============================================================================

BEGIN;

-- 既存の partial / 旧定義の index を確実に除去
DROP INDEX IF EXISTS "idx_search_logs_query";

-- schema.prisma の @@index([query, createdAt(sort: Desc)]) と同一定義で作り直す
CREATE INDEX IF NOT EXISTS "idx_search_logs_query"
  ON "search_logs" ("query", "created_at" DESC);

COMMIT;

-- 確認用（任意）: 定義に WHERE 句が無い（partial でない）ことを確認する
--   SELECT indexname, indexdef FROM pg_indexes
--   WHERE indexname = 'idx_search_logs_query';
