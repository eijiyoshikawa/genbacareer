-- hiring_fee_amount の CHECK 制約レンジを 200,000〜2,000,000 → 498,000〜2,000,000 に変更。
-- 2026-05 のビジネスモデル変更 (3 プラン制) に伴い、成果報酬の最低額を ¥498,000 に統一。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/jobs_hiring_fee_amount_range_498k.sql
--
-- 備考:
--   - 既存の hiring_fee_amount で ¥200,000〜¥497,999 の値が入っている求人があれば、
--     先にそれらを ¥498,000 以上に更新してから本 SQL を実行する必要がある。
--   - 該当データがあれば事前 SELECT で確認:
--       SELECT id, title, hiring_fee_amount FROM jobs
--       WHERE hiring_fee_amount IS NOT NULL AND hiring_fee_amount < 498000;

SET statement_timeout = 0;
SET lock_timeout = '30s';

-- 既存の旧レンジ制約を削除して新レンジで再作成
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_hiring_fee_amount_range;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_hiring_fee_amount_range
  CHECK (hiring_fee_amount IS NULL OR (hiring_fee_amount BETWEEN 498000 AND 2000000));
