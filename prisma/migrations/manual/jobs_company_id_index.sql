-- 企業ダッシュボード KPI クエリ高速化のための jobs.company_id インデックス。
-- 本番 DB に対して 1 回だけ psql で実行する想定。
--
-- 実行方法:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/jobs_company_id_index.sql
--   ※ DIRECT_URL を使うこと（PgBouncer 経由だと CONCURRENTLY が動かない）
--
-- 効果:
--   - /company/dashboard 上部 3 カード (status 別 groupBy / count / aggregate viewCount)
--     が seq scan から index scan になり、テーブル増加に対して安定したレイテンシ
--   - prisma db push でも同じインデックスが宣言されているので、
--     新規環境では本 SQL の実行は不要
--
-- 注意:
--   - CREATE INDEX CONCURRENTLY はテーブルロックを取らないので本番でも安全
--   - トランザクション内では実行できないため、psql で直接流す（または BEGIN/COMMIT 無し）

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_jobs_company_status"
  ON jobs (company_id, status);
