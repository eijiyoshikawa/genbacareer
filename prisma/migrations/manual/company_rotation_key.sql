-- C8 公平ローテーション (2026-05-21 追加) の DB 変更。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/company_rotation_key.sql
--
-- 既存 plan_tier index を rotationKey を含むものへ置き換え。
-- すべて IF NOT EXISTS / 存在チェック付きで idempotent。

SET statement_timeout = 0;
SET lock_timeout = '30s';

-- ----------------------------------------------------------------------------
-- 1) カラム追加 (rotation_key)
-- ----------------------------------------------------------------------------
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS rotation_key integer NOT NULL DEFAULT 0;

-- ----------------------------------------------------------------------------
-- 2) 初期値: ランダム化 (cron が未稼働でも初回から rotation が効くように)
-- ----------------------------------------------------------------------------
UPDATE companies
SET rotation_key = floor(random() * 1000000)::int
WHERE rotation_key = 0;

-- ----------------------------------------------------------------------------
-- 3) 新しい複合 index (plan_tier DESC, rotation_key ASC) を作成
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_companies_plan_tier_rotation
  ON companies (plan_tier DESC, rotation_key ASC);

-- ----------------------------------------------------------------------------
-- 4) 旧 index (plan_tier, plan_paid_until) を削除
--    rotationKey 版に置き換わるので不要
-- ----------------------------------------------------------------------------
DROP INDEX IF EXISTS idx_companies_plan_tier;
