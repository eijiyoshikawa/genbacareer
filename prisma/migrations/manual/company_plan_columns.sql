-- 掲載プラン (C2-C8) のカラムを Company テーブルに追加。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/company_plan_columns.sql
--
-- すべて IF NOT EXISTS / 存在チェック付きで idempotent。
-- 既存企業はすべて plan_type='success_fee' (成果報酬) デフォルトで作られる
-- (DB 側 default に従う)。
--
-- C8 上位表示で使う plan_tier も同時に追加し、既存企業の plan_type='success_fee'
-- は plan_tier=3 (paid 平等枠) として初期化される。

SET statement_timeout = 0;
SET lock_timeout = '30s';

-- ----------------------------------------------------------------------------
-- 1) カラム追加
-- ----------------------------------------------------------------------------
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS plan_type             varchar(20) NOT NULL DEFAULT 'success_fee',
  ADD COLUMN IF NOT EXISTS plan_paid_until       timestamptz NULL,
  ADD COLUMN IF NOT EXISTS plan_activated_at     timestamptz NULL,
  ADD COLUMN IF NOT EXISTS plan_prepaid_full     boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS plan_tier             integer     NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS plan_notes            varchar(500) NULL,
  ADD COLUMN IF NOT EXISTS plan_expiry_notified_at timestamptz NULL;

-- ----------------------------------------------------------------------------
-- 2) CHECK 制約
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_plan_type_check'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_plan_type_check
      CHECK (plan_type IN ('success_fee','monthly_12','monthly_24','campaign_free','sns_client'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_plan_tier_check'
  ) THEN
    ALTER TABLE companies
      ADD CONSTRAINT companies_plan_tier_check
      CHECK (plan_tier BETWEEN 0 AND 3);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) Index
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_companies_plan_tier
  ON companies (plan_tier DESC, plan_paid_until);

CREATE INDEX IF NOT EXISTS idx_companies_plan_expiry
  ON companies (plan_type, plan_paid_until);

-- ----------------------------------------------------------------------------
-- 4) HelloWork 取り込みは plan_tier=0 (paid 企業より下) に強制
--    direct 企業は default の success_fee + plan_tier=3 のまま
-- ----------------------------------------------------------------------------
UPDATE companies
SET plan_type = 'success_fee', plan_tier = 0
WHERE source = 'hellowork' AND plan_tier = 3;
