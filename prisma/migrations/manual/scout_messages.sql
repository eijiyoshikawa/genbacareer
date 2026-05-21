-- スカウトメッセージ機能 (12.x) の DB 追加。
-- 企業 → 求職者の片方向メッセージング。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/scout_messages.sql
--
-- このスクリプトは自己完結型で、`prisma db push` を経由せずに
-- scout_messages テーブル本体・FK・INDEX・CHECK 制約・partial UNIQUE
-- index をまとめて作成する。すべて IF NOT EXISTS / 存在チェック付きなので
-- 何度実行しても安全 (idempotent)。

SET statement_timeout = 0;
SET lock_timeout = '30s';

-- ----------------------------------------------------------------------------
-- 1) テーブル本体
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scout_messages (
  id              uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid          NOT NULL,
  job_id          uuid          NOT NULL,
  user_id         uuid          NOT NULL,
  company_user_id uuid          NULL,

  subject         varchar(120)  NOT NULL,
  body            text          NOT NULL,

  status          varchar(20)   NOT NULL DEFAULT 'sent',
  sent_at         timestamptz   NOT NULL DEFAULT now(),
  read_at         timestamptz   NULL,
  expires_at      timestamptz   NOT NULL,
  email_sent_at   timestamptz   NULL,
  decline_reason  varchar(200)  NULL,
  created_at      timestamptz   NOT NULL DEFAULT now(),
  updated_at      timestamptz   NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 2) 外部キー制約 (Cascade: company / job / user の削除に追従)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scout_messages_company_id_fkey'
  ) THEN
    ALTER TABLE scout_messages
      ADD CONSTRAINT scout_messages_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scout_messages_job_id_fkey'
  ) THEN
    ALTER TABLE scout_messages
      ADD CONSTRAINT scout_messages_job_id_fkey
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scout_messages_user_id_fkey'
  ) THEN
    ALTER TABLE scout_messages
      ADD CONSTRAINT scout_messages_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3) 通常 index (検索性能用)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_scouts_inbox
  ON scout_messages (user_id, status, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_scouts_outbox
  ON scout_messages (company_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_scouts_expiry
  ON scout_messages (expires_at);

-- ----------------------------------------------------------------------------
-- 4) CHECK 制約
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scout_messages_status_check'
  ) THEN
    ALTER TABLE scout_messages
      ADD CONSTRAINT scout_messages_status_check
      CHECK (status IN ('sent','read','expired','declined'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scout_messages_body_len_check'
  ) THEN
    ALTER TABLE scout_messages
      ADD CONSTRAINT scout_messages_body_len_check
      CHECK (char_length(body) BETWEEN 20 AND 2000);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scout_messages_subject_len_check'
  ) THEN
    ALTER TABLE scout_messages
      ADD CONSTRAINT scout_messages_subject_len_check
      CHECK (char_length(subject) BETWEEN 5 AND 120);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'scout_messages_expiry_after_sent_check'
  ) THEN
    ALTER TABLE scout_messages
      ADD CONSTRAINT scout_messages_expiry_after_sent_check
      CHECK (expires_at > sent_at);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5) Partial UNIQUE Index
-- (status NOT IN ('expired','declined')) のときだけ
-- (company_id, job_id, user_id) が UNIQUE。
-- 「同じ求人で同じ求職者にアクティブなスカウトが 1 件のみ」を保証し、
-- 期限切れや辞退後は再送可能になる。
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS scout_messages_active_unique
  ON scout_messages (company_id, job_id, user_id)
  WHERE status NOT IN ('expired','declined');
