-- Backfill: HelloWork 取り込み企業の plan_tier を 0 に修正。
--
-- 背景:
--   company_plan_columns.sql (1回限りの移行) で当時の HelloWork 企業は
--   plan_tier=0 に修正済みだったが、src/lib/crawler/import-batch.ts の
--   upsertHelloworkCompany() の create 分岐が plan_tier を明示的に
--   セットしていなかったため、以後 hourly cron (/api/cron/hellowork-import)
--   が新規作成する HelloWork 企業はスキーマの default である plan_tier=3
--   (有償企業と同率の最上位表示) で作られ続けていた。
--   アプリコードは修正済み (import-batch.ts で planTier() を明示指定)。
--   本スクリプトはコード修正前に作られた既存の不正行を one-time で是正する。
--
-- 実行方法（本番）:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/fix_hellowork_plan_tier_backfill.sql
--
-- idempotent（該当行がなければ 0 件 UPDATE で終わる）。

UPDATE companies
SET plan_tier = 0
WHERE source = 'hellowork' AND plan_tier <> 0;
