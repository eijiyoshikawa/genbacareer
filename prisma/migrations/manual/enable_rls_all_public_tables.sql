-- ============================================================================
-- public スキーマ全テーブルに Row Level Security (RLS) を有効化する。
--
-- 背景（緊急セキュリティ対応）:
--   Supabase Security Advisor が以下の Critical を検出した:
--     - rls_disabled_in_public   … RLS 無効テーブルが PostgREST(anon) で公開状態
--     - sensitive_columns_exposed … users 等のパスワード/個人情報カラムが API 公開
--   Supabase は public スキーマに対し自動 REST API (PostgREST) を anon キーで
--   公開しており、RLS 未設定だと匿名キーで全テーブルの read/edit/delete が可能。
--
-- なぜ RLS 有効化だけで安全か（アプリ無影響の根拠）:
--   - 本アプリのテーブルデータアクセスは 100% Prisma 経由（DATABASE_URL の
--     postgres ロール = テーブル所有者）。所有者は RLS を「バイパス」する
--     （FORCE ROW LEVEL SECURITY を付けない限り）。→ アプリは無影響。
--   - Supabase JS クライアントは storage（ロゴ/画像）専用で service_role キー
--     使用（RLS バイパス）。anon キーでテーブルを触る箇所は存在しない。
--   - ポリシーを一切作らない = anon / authenticated ロール（PostgREST）からは
--     全行アクセス不可になる。これが Supabase 推奨の遮断方法。
--   - 本サイトの認証は NextAuth であり Supabase Auth は未使用のため、
--     authenticated ロール向けポリシーは不要。
--
-- 実行方法（本番 / Session 接続で実行）:
--   DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//;s/"$//')
--   SESSION_URL=$(echo "$DATABASE_URL" | sed 's|:6543/|:5432/|' | sed -E 's|/postgres\?.*|/postgres|')
--   psql "$SESSION_URL" -f prisma/migrations/manual/enable_rls_all_public_tables.sql
--
-- 冪等性:
--   - ENABLE ROW LEVEL SECURITY は既に有効でもエラーにならない。
--   - REVOKE も対象権限が無くてもエラーにならない。
--   - 何度実行しても安全。
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) public スキーマの全ベーステーブルに RLS を有効化（ポリシーは作らない）
--    将来テーブルが増えても拾えるよう動的に列挙する。
--    FORCE は付けない（所有者 = Prisma 接続がバイパスできるようにするため）。
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;',
      r.tablename
    );
    RAISE NOTICE 'RLS enabled: public.%', r.tablename;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2) マテリアライズドビューは RLS を設定できないため、PostgREST 経由の
--    anon / authenticated からの SELECT 権限を剥奪して公開を止める。
--    （集計値のみで機微情報は無いが、Advisor の公開検出対象になりうるため遮断）
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT matviewname
    FROM pg_matviews
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'REVOKE ALL ON public.%I FROM anon, authenticated;',
      r.matviewname
    );
    RAISE NOTICE 'REVOKE on matview: public.%', r.matviewname;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3) 確認用クエリ（手動で実行して RLS 未設定テーブルが 0 件になることを確認）:
--
--   SELECT relname, relrowsecurity, relforcerowsecurity
--   FROM pg_class c
--   JOIN pg_namespace n ON n.oid = c.relnamespace
--   WHERE n.nspname = 'public' AND c.relkind = 'r'
--   ORDER BY relrowsecurity, relname;
--   -- relrowsecurity が全て true なら OK。relforcerowsecurity は false のままで良い。
-- ----------------------------------------------------------------------------
