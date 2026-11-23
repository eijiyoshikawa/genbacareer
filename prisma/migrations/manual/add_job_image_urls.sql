-- 求人ごとの写真アップロード対応。
-- jobs.image_urls: 先頭がヒーロー画像、以降はギャラリー（最大 12 枚を想定）。
-- 既存の company.photos（会社単位の写真）とは別に、求人個別の写真を持たせる。
--
-- 適用:
--   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//;s/"$//')
--   SESSION_URL=$(echo "$DATABASE_URL" | sed 's|:6543/|:5432/|' | sed -E 's|/postgres\?.*|/postgres|')
--   psql "$SESSION_URL" -f prisma/migrations/manual/add_job_image_urls.sql

ALTER TABLE "jobs"
  ADD COLUMN IF NOT EXISTS "image_urls" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
