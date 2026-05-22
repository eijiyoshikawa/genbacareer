-- pg_trgm 拡張と GIN インデックスを有効化する手動マイグレーション。
-- 本番 DB に対して 1 回だけ psql で実行する想定（Prisma スキーマでは表現できない）。
--
-- 実行方法:
--   psql "$DATABASE_URL" -f prisma/migrations/manual/pg_trgm.sql
--
-- 効果:
--   - Job.title / description の類似検索が ILIKE より高速・柔軟になる
--   - 「型枠大工」「かたわく」など部分一致や typo にも耐性

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 求人タイトル
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm
  ON jobs USING GIN (title gin_trgm_ops);

-- 求人説明（長文）
CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm
  ON jobs USING GIN (description gin_trgm_ops);

-- 企業名（公開ページの検索でも使う）
CREATE INDEX IF NOT EXISTS idx_companies_name_trgm
  ON companies USING GIN (name gin_trgm_ops);

-- 並び順を「類似度の高い順」にする際は similarity(...) を使う。
-- 例: SELECT * FROM jobs ORDER BY similarity(title, $1) DESC LIMIT 20;
