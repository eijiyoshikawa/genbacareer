-- LINE ログイン(方法A: lineUserId優先解決)高速化のための users.line_user_id インデックス。
-- 本番 DB に対して 1 回だけ psql で実行する想定。
--
-- 背景:
--   src/lib/auth.ts の signIn コールバックが LINE ログインのたびに
--   prisma.user.findFirst({ where: { lineUserId } }) を実行するが、
--   この列にインデックスが無くテーブル増加とともに seq scan 化する。
--
-- 実行方法:
--   psql "$DIRECT_URL" -f prisma/migrations/manual/users_line_user_id_index.sql
--   ※ DIRECT_URL を使うこと（PgBouncer 経由だと CONCURRENTLY が動かない）
--
-- 注意:
--   - CREATE INDEX CONCURRENTLY はテーブルロックを取らないので本番でも安全
--   - トランザクション内では実行できないため、psql で直接流す（または BEGIN/COMMIT 無し）
--   - prisma db push でも同じインデックスが宣言されているので、
--     新規環境では本 SQL の実行は不要

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_users_line_user_id"
  ON users (line_user_id);
