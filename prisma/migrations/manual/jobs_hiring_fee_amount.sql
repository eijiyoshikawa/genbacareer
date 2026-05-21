-- 求人ごとの成果報酬単価 (hiring_fee_amount) カラム追加。
-- NULL の場合は HIRING_FEE_AMOUNT 定数（498,000）にフォールバックする。
-- admin だけが設定可能、企業/求職者は閲覧のみ（API 側で制御）。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/jobs_hiring_fee_amount.sql
--
-- 備考:
--   - ADD COLUMN ... NULL は PostgreSQL では即座に完了（テーブル書き換え無し）
--   - 既存求人は全て NULL になり、ランタイムでフォールバック値が使われる
--   - prisma db push でも同じカラムが宣言されるため、新規環境では本 SQL は不要

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS hiring_fee_amount integer;

-- CHECK 制約: 設定された場合のみ 200,000 〜 2,000,000 の範囲を強制
-- （NULL は OK、フォールバック値 498,000 が使われる）
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_hiring_fee_amount_range'
  ) THEN
    ALTER TABLE jobs
      ADD CONSTRAINT jobs_hiring_fee_amount_range
      CHECK (hiring_fee_amount IS NULL OR (hiring_fee_amount BETWEEN 200000 AND 2000000));
  END IF;
END $$;
