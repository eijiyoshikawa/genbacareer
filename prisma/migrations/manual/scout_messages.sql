-- スカウトメッセージ機能 (12.x) の DB 追加。
-- 企業 → 求職者の片方向メッセージング。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/scout_messages.sql
--
-- 備考:
--   - Prisma の `prisma db push` でも model 定義から CREATE TABLE される
--     が、本 SQL は partial unique index と CHECK 制約を保証するために必要
--   - partial unique index は Prisma schema では宣言不可なので manual SQL で
--   - 既存環境では Prisma が先にテーブルを作っていることがあるので IF NOT EXISTS で安全側に
--   - Supabase session pooler の statement_timeout 対策で 0 / lock 30s に変更

SET statement_timeout = 0;
SET lock_timeout = '30s';

-- ----------------------------------------------------------------------------
-- CHECK 制約 (Prisma schema では宣言できないため SQL で別管理)
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
-- Partial UNIQUE Index
-- (status NOT IN ('expired','declined')) のときだけ
-- (company_id, job_id, user_id) が UNIQUE。
-- つまり「同じ求人で同じ求職者にアクティブなスカウトが 1 件のみ」を保証し、
-- 期限切れや辞退後は再送可能になる。
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS scout_messages_active_unique
  ON scout_messages (company_id, job_id, user_id)
  WHERE status NOT IN ('expired','declined');
