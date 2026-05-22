# 🚀 D-1 リリース当日 作業手順書

> **このファイルはリリース前日 (D-1) に実施する A〜C カテゴリの作業を、
> コマンド付きで上から順に潰せる形にまとめたチェックリストです。**
>
> 想定所要時間: **半日〜1 日**（外部サービスの審査待ちがあれば +1〜2 日）。

---

## 0. 事前準備（前日までに）

- [ ] 全 PR のマージ完了確認 (`git log main --oneline -10`)
- [ ] CI / Lint / Build パス確認 (`pnpm preflight --skip=tests` でローカル検証)
- [ ] 関係者へリリース予定を共有

---

## A. 環境変数 / 外部サービス設定

### A-1. シークレット生成（1 分）

```bash
# CRON_SECRET / NEXTAUTH_SECRET + ADMIN_PASSWORD_HASH を一度に生成
pnpm gen:secret --admin-pw='<12 文字以上の管理者パスワード>'
```

出力された 3 つの値をメモ。

- [ ] `CRON_SECRET` メモした
- [ ] `NEXTAUTH_SECRET` メモした
- [ ] `ADMIN_PASSWORD_HASH` メモした

### A-2. Supabase 設定（5 分）

- [ ] Supabase Dashboard → Settings → Database
  - `DATABASE_URL` (Pooler URL, `?pgbouncer=true` 付き) を取得
  - `DIRECT_URL` (Direct URL) を取得
- [ ] Settings → API
  - `NEXT_PUBLIC_SUPABASE_URL` を取得（`https://xxx.supabase.co`）
  - `SUPABASE_SERVICE_ROLE_KEY` を取得（**機密、漏洩注意**）
- [ ] Database → Backups で Daily backup が有効か確認

### A-3. Google Cloud Console（30 分〜）

#### A-3-1. プロジェクト準備
- [ ] Google Cloud Console でプロジェクト作成 or 既存プロジェクト選択

#### A-3-2. OAuth 同意画面（重要）
**Calendar OAuth と Login OAuth で共用**:
- [ ] OAuth 同意画面 → アプリ名「ゲンバキャリア」
- [ ] サポートメール: `info@let-inc.net`
- [ ] スコープに `userinfo.email` `userinfo.profile` `openid` を追加
- [ ] **公開状態を「本番」に切り替え** ← これを忘れると 7 日で refresh token 失効
- [ ] プライバシーポリシー URL: `https://www.genbacareer.jp/privacy`
- [ ] 利用規約 URL: `https://www.genbacareer.jp/terms`

#### A-3-3. Calendar OAuth クライアント
- [ ] API とサービス → ライブラリ → 「Google Calendar API」を有効化
- [ ] 認証情報 → OAuth 2.0 クライアント ID を作成（タイプ: ウェブアプリ）
- [ ] Authorized redirect URI に追加:
  - `https://www.genbacareer.jp/api/company/calendar/callback`
- [ ] 取得した Client ID / Secret を保管:
  - `GOOGLE_CALENDAR_CLIENT_ID`
  - `GOOGLE_CALENDAR_CLIENT_SECRET`

#### A-3-4. Google Login OAuth（任意）
- [ ] 同じ OAuth クライアントの Authorized redirect URI に追加:
  - `https://www.genbacareer.jp/api/auth/callback/google`
- [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` として保管

#### A-3-5. Search Console OAuth（任意）
- [ ] Google API Library で「Search Console API」を有効化
- [ ] OAuth Playground (https://developers.google.com/oauthplayground/) で refresh_token 取得
  - スコープ: `https://www.googleapis.com/auth/webmasters.readonly`
- [ ] `GSC_OAUTH_CLIENT_ID` / `_SECRET` / `_REFRESH_TOKEN` を保管
- [ ] `GSC_SITE_URL` = `https://www.genbacareer.jp/` または `sc-domain:genbacareer.jp`

#### A-3-6. Maps API（任意・地図表示用）
- [ ] Maps JavaScript API を有効化
- [ ] API キーを発行、**HTTP リファラ制限**で `*.genbacareer.jp/*` のみ許可
- [ ] `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`

### A-4. LINE Developer Console（30 分）

#### A-4-1. LINE 公式アカウント（応募連携用）
- [ ] Messaging API チャネル作成
- [ ] Webhook URL: `https://www.genbacareer.jp/api/line/webhook`
- [ ] 取得:
  - `LINE_CHANNEL_ID`
  - `LINE_CHANNEL_SECRET`
  - `LINE_CHANNEL_ACCESS_TOKEN`
  - `LINE_OA_ID` (Basic ID、`@xxxxxxxx` の `@` を除いた形)
  - `NEXT_PUBLIC_LINE_OA_ID` (同上)

#### A-4-2. LINE Login（求職者 1 タップ登録）
- [ ] LINE Login チャネル作成
- [ ] Callback URL: `https://www.genbacareer.jp/api/auth/callback/line`
- [ ] スコープに `profile` `openid` **`email`** を有効化（email 必須）
- [ ] 取得:
  - `LINE_CLIENT_ID`
  - `LINE_CLIENT_SECRET`

#### A-4-3. LIFF（任意）
- [ ] LIFF アプリ追加
- [ ] Endpoint URL: `https://www.genbacareer.jp/liff/apply/{id}`
- [ ] `NEXT_PUBLIC_LIFF_ID`

### A-5. メール送信 (Gmail Workspace 想定)（15 分）

- [ ] `genbacareer@let-inc.net` で 2 段階認証を有効化
- [ ] Google アカウント → セキュリティ → アプリパスワード生成
- [ ] 取得:
  - `SMTP_USER` = `genbacareer@let-inc.net`
  - `SMTP_PASS` = 16 桁アプリパスワード
  - `MAIL_FROM` = `ゲンバキャリア <genbacareer@let-inc.net>` (任意)

### A-6. Stripe（採用ボーナス決済する場合のみ・15 分）

- [ ] Stripe ダッシュボードで本番化 (Activate)
- [ ] Secret key 取得 → `STRIPE_SECRET_KEY` (sk_live_...)
- [ ] Webhooks → Add endpoint
  - URL: `https://www.genbacareer.jp/api/webhooks/stripe`
  - Events: `invoice.paid` `invoice.payment_failed`
- [ ] Signing secret → `STRIPE_WEBHOOK_SECRET`

### A-7. ハローワーク API（任意・公共求人取り込み用）

- [ ] ハローワークインターネットサービス API 利用申請
- [ ] 承認後:
  - `HELLOWORK_API_USER`
  - `HELLOWORK_API_PASS`

### A-8. Sentry（推奨）

- [ ] Sentry プロジェクト作成 (Next.js)
- [ ] DSN を取得:
  - `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (同値)

### A-9. Google Analytics 4

- [ ] GA4 プロパティ作成
- [ ] 測定 ID `G-XXXXXXXXXX` を取得 → `NEXT_PUBLIC_GA_ID`

### A-10. Search Console サイト所有権

- [ ] Search Console プロパティ追加（`www.genbacareer.jp`）
- [ ] HTML タグ方式で verify → `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` 取得
- [ ] sitemap 送信は **D-day** に実施

### A-11. Vercel env 投入（30 分）

Vercel Dashboard → Settings → Environment Variables (**Production** にチェック必須):

- [ ] Database (4): `DATABASE_URL` / `DIRECT_URL` / `ENSURE_SCHEMA=false` / `NEXT_PUBLIC_BASE_URL=https://www.genbacareer.jp`
- [ ] NextAuth (3): `NEXTAUTH_SECRET` / `NEXTAUTH_URL=https://www.genbacareer.jp` / `APP_BASE_URL=https://www.genbacareer.jp`
- [ ] Supabase (2): `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Cron (1): `CRON_SECRET`
- [ ] Google (4): `GOOGLE_CALENDAR_CLIENT_ID` / `_SECRET` / `GOOGLE_CLIENT_ID` / `_SECRET`
- [ ] LINE (7): `LINE_CHANNEL_ID` / `_SECRET` / `_ACCESS_TOKEN` / `LINE_OA_ID` / `NEXT_PUBLIC_LINE_OA_ID` / `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET`
- [ ] SMTP (2-3): `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM`
- [ ] Admin (2): `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH`
- [ ] Sentry (2): `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- [ ] GA4 (1): `NEXT_PUBLIC_GA_ID`
- [ ] Search Console (4 任意): `GSC_OAUTH_*` / `GSC_SITE_URL` / `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- [ ] Maps (1 任意): `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- [ ] Hellowork (2 任意): `HELLOWORK_API_USER` / `_PASS`
- [ ] Stripe (2 任意): `STRIPE_SECRET_KEY` / `_WEBHOOK_SECRET`
- [ ] MoneyForward (3 任意): `MF_CLIENT_ID` / `_SECRET` / `_OFFICE_ID`
- [ ] AI (1 任意): `ANTHROPIC_API_KEY`
- [ ] LIFF (1 任意): `NEXT_PUBLIC_LIFF_ID`

### A-12. 投入後 検証

```bash
# Preview デプロイを 1 回走らせて、本番値で env が拾えるか確認
# Vercel CLI で preview に env 流し込み:
vercel env pull .env.production.local --environment=production

# ローカルで preview 環境想定のチェック
pnpm check:env --env=production
```

- [ ] error が 0 件
- [ ] warning は許容（必須ではない env）

---

## B. データベース・スキーマ

### B-1. 本番 DB に最新スキーマを反映

```bash
# Vercel の DATABASE_URL / DIRECT_URL を一時的に .env に書いて
export DATABASE_URL='<本番 Pooler URL>'
export DIRECT_URL='<本番 Direct URL>'

# Prisma db push
pnpm prisma db push
```

- [ ] `prisma db push` 成功
- [ ] 警告メッセージにデータ削除を伴うものが無い

### B-2. インデックス・拡張機能の確認

```bash
# 本番 DB に直接接続して確認 (psql)
psql "$DIRECT_URL" -c "\dx"        # 拡張機能 (pg_trgm 等)
psql "$DIRECT_URL" -c "\di+ jobs*" # jobs テーブルの index
```

- [ ] `pg_trgm` 拡張が入っている
- [ ] `idx_jobs_status_published` などの主要 index がある

### B-3. ENSURE_SCHEMA=false 投入の安全確認

ensureSchema には 53 件の `ALTER TABLE` / `CREATE INDEX` 文があります。
本番 DB にすべて適用されているか念のため確認:

- [ ] B-1 で `prisma db push` 完了済 → ALTER TABLE 系はカバー
- [ ] Vercel env で `ENSURE_SCHEMA=false` を設定（cold start 短縮）

---

## C. コンテンツ準備

### C-1. 法務系ページ最終チェック

- [ ] `/terms` (利用規約) を本番運営方針と照合
- [ ] `/privacy` (プライバシーポリシー) を実際の取扱と照合
- [ ] `/legal` (特商法表記) の販売事業者・連絡先が最新
- [ ] `/about` (運営事業者) の許可番号・住所が最新

### C-2. 管理者ユーザー作成

- [ ] `ADMIN_EMAIL` で `/admin/login` から ログイン可能か確認
- [ ] 2FA を有効化推奨（`/admin/security` から TOTP 設定）

### C-3. 初期記事 5〜10 本投入

`/admin/docs/article-guidelines` のガイドラインに沿って:
- [ ] 職種解説 1〜2 本（「鳶職とは」など）
- [ ] 資格・免許 1〜2 本（「1 級施工管理技士」など）
- [ ] 年収・給与 1 本（「電気工事士の年収」など）
- [ ] 転職・キャリア 1〜2 本
- [ ] 体験談 1 本

各記事:
- [ ] 著者を `/authors/[slug]` のいずれかに紐づけ
- [ ] アイキャッチ 1200×630
- [ ] タグ 5〜8 個
- [ ] 内部リンク 3〜5 件

### C-4. 初期掲載企業 1 〜数社

- [ ] 自社 or パートナー企業 1〜3 社を `/admin/companies` から登録
- [ ] ロゴをアップロード（Supabase Storage 動作確認も兼ねる）
- [ ] 各社に求人 1〜2 件を `/admin` または企業ダッシュボードから作成
- [ ] 公開状態で `/jobs/[id]` にアクセスして表示確認

### C-5. メールテンプレ最終チェック

実際に各種メールを送信して、表記・リンクを確認:
- [ ] 求職者 新規登録 → 確認メール (件名・本文に「ゲンバキャリア」表記)
- [ ] パスワードリセット → リセットリンク
- [ ] 求職者 応募完了通知
- [ ] 企業 応募受信通知
- [ ] お祝い金申請 通知

---

## ✅ A〜C 完了後の確認

```bash
# 最終 preflight
pnpm preflight
```

- [ ] typecheck / lint / build / env / tests すべてグリーン

次は **D-day**: デプロイ → 動作確認 (Section D) に進めます。

---

## トラブル時のクイック ロールバック

万一デプロイ後に致命的な問題が起きたら:

1. Vercel Dashboard → Deployments → 1 つ前の Deployment → "Promote to Production"
2. または Vercel env で `ENSURE_SCHEMA=true` に一時的に戻す
3. Sentry でエラー詳細を確認 → 該当 PR を revert

---

**最終更新: 2026 年 5 月 21 日**
