-- 早期退職 / 戻入処理 (C3, 2026-05) の DB 追加。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/early_resignations.sql
--
-- 自己完結型 SQL: applications テーブルへの hired_at カラム追加 +
-- early_resignations テーブル本体 + FK + INDEX + CHECK 制約 を一括で作る。
-- すべて IF NOT EXISTS / 存在チェック付きで idempotent。

SET statement_timeout = 0;
SET lock_timeout = '30s';

-- ----------------------------------------------------------------------------
-- 1) Application に hired_at カラムを追加
-- ----------------------------------------------------------------------------
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS hired_at timestamptz NULL;

-- 既存の status='hired' レコードのうち hired_at が NULL のものは、
-- updatedAt をフォールバック (status 遷移時刻として近似値)
UPDATE applications
SET hired_at = updated_at
WHERE status = 'hired' AND hired_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2) early_resignations テーブル
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS early_resignations (
  id                    uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        uuid          NOT NULL UNIQUE,
  company_id            uuid          NOT NULL,
  job_id                uuid          NOT NULL,
  user_id               uuid          NOT NULL,

  hired_at              timestamptz   NOT NULL,
  resigned_at           timestamptz   NOT NULL,
  months_after_hire     integer       NOT NULL,

  refund_rate           integer       NOT NULL,
  original_fee_amount   integer       NOT NULL,
  refund_amount         integer       NOT NULL,

  status                varchar(20)   NOT NULL DEFAULT 'reported',

  company_note          text          NULL,
  admin_note            text          NULL,

  reported_by           uuid          NULL,
  approved_by           uuid          NULL,
  approved_at           timestamptz   NULL,
  rejected_by           uuid          NULL,
  rejected_at           timestamptz   NULL,

  mf_credit_note_id     varchar(100)  NULL,
  invoiced_at           timestamptz   NULL,

  created_at            timestamptz   NOT NULL DEFAULT now(),
  updated_at            timestamptz   NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3) 外部キー
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_application_id_fkey'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_application_id_fkey
      FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_company_id_fkey'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_job_id_fkey'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_user_id_fkey'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4) CHECK 制約
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_status_check'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_status_check
      CHECK (status IN ('reported','approved','rejected','invoiced'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_resigned_after_hired_check'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_resigned_after_hired_check
      CHECK (resigned_at > hired_at);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_refund_rate_check'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_refund_rate_check
      CHECK (refund_rate BETWEEN 0 AND 100);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_months_check'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_months_check
      CHECK (months_after_hire >= 1);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'early_resignations_amounts_check'
  ) THEN
    ALTER TABLE early_resignations
      ADD CONSTRAINT early_resignations_amounts_check
      CHECK (refund_amount >= 0 AND original_fee_amount > 0 AND refund_amount <= original_fee_amount);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5) Index
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_early_resignations_company
  ON early_resignations (company_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_early_resignations_status
  ON early_resignations (status, created_at DESC);
