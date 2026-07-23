-- 成果報酬の料金モデル変更 (2026-07): 固定額 ¥498,000〜 → 採用者の理論年収 × 35%。
-- hiring_fee_amount (admin 個別確定額) の CHECK レンジを 498,000〜2,000,000 → 100,000〜5,000,000 に変更。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/jobs_hiring_fee_amount_range_35pct.sql
-- ※ ensure-schema にも同等の冪等 DDL を追加済みのため、通常はデプロイ後に自動適用される。

SET statement_timeout = 0;
SET lock_timeout = '30s';

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_hiring_fee_amount_range;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_hiring_fee_amount_range
  CHECK (hiring_fee_amount IS NULL OR (hiring_fee_amount BETWEEN 100000 AND 5000000));
