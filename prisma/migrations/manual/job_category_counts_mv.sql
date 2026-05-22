-- カテゴリ別アクティブ求人件数の materialized view。
-- トップページなどで毎リクエスト GROUP BY するのは無駄なので、定期 REFRESH 方式に。
--
-- 実行方法:
--   psql "$DATABASE_URL" -f prisma/migrations/manual/job_category_counts_mv.sql
--
-- 更新:
--   REFRESH MATERIALIZED VIEW CONCURRENTLY job_category_counts;
--   → cron で 5 分おきに叩く（/api/cron/refresh-mv）
--
-- 注意:
--   CONCURRENTLY 使用には UNIQUE INDEX が必要なので、PK を unique に張る。

CREATE MATERIALIZED VIEW IF NOT EXISTS job_category_counts AS
SELECT
  category,
  COUNT(*)::bigint AS count
FROM jobs
WHERE status = 'active'
GROUP BY category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_category_counts_category
  ON job_category_counts (category);

-- 都道府県 × カテゴリの細分集計（カテゴリページ用）
CREATE MATERIALIZED VIEW IF NOT EXISTS job_pref_category_counts AS
SELECT
  prefecture,
  category,
  COUNT(*)::bigint AS count
FROM jobs
WHERE status = 'active'
GROUP BY prefecture, category;

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_pref_category_counts_pk
  ON job_pref_category_counts (prefecture, category);
