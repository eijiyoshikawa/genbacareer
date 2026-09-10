# リリース前 手作業リマインダー

> **このファイルはあなたが手作業で進めるべき項目のリスト。**
> 上から順に着手することを推奨。完了したら ✅ を付けるか削除。

---

## 🔴 最優先（今すぐ着手 — リードタイムが長いもの）

### 1. GbizINFO API キー取得 ✅ 完了

- [x] API キー取得
- [ ] **Vercel 環境変数 `GBIZ_API_TOKEN` を設定**（Production / Preview / Development）
  - Vercel Dashboard → Settings → Environment Variables → New
  - Name: `GBIZ_API_TOKEN`  Value: 取得したトークン  Environments: 全部チェック
- [ ] 設定後、`/company/gbizinfo` で 13 桁の法人番号を入力して保存ボタン → GbizINFO から自動取り込み

**実装済み機能** (PR #104):
- `/company/gbizinfo` 管理画面: 法人番号入力 + 取り込み / 再取得 / 削除ボタン
- `/companies/[id]` 公開ページ: 建設業許可・設立年月・資本金・従業員数・表彰歴を自動表示
- 24h CDN キャッシュで API 負荷を最小化

**follow-up**:
- [x] JobCard に「建設業許可あり」バッジを追加（PR #106）
- [x] Cron で月次自動再取得 `/api/cron/refresh-gbiz`（PR #106）
- [x] 求人投稿時に法人番号入力が無ければリマインドバナー表示（PR #107）

---

## 🟠 高優先（リリース直前にやる）

### 2. Supabase DB バックアップの自動化

- [ ] Supabase Dashboard → Database → Backups
- [ ] Daily backup が有効か確認（Pro プランは自動で有効）
- [ ] PITR (Point-In-Time Recovery) を有効化（任意、Pro プラン）

### 3. Vercel 環境変数の Preview 環境への展開

`DATABASE_URL` / `NEXTAUTH_SECRET` 等を Production にしか設定してない場合、Preview デプロイが落ちる。
- [ ] Vercel → Settings → Environment Variables を開き、各変数の Environment に `Preview` チェックを追加
- 対象: `DATABASE_URL` / `DIRECT_URL` / `NEXTAUTH_*` / `LINE_*` / `STRIPE_*` / `SMTP_*` / `MAIL_FROM` / `SENTRY_*` / `VAPID_*`

### 4. Supabase パスワードのローテーション（漏洩リスク対応）

過去のチャットで一度パスワードが平文で共有されたため、念のため:
- [ ] Supabase → Settings → Database → Reset database password
- [ ] 新パスワードで `.env` の `DATABASE_URL` / `DIRECT_URL` を更新
- [ ] Vercel 環境変数（Production / Preview）も更新
- [ ] Vercel で Redeploy

### 5. Cron Job の Vercel 登録（vercel.json に登録済み）

`vercel.json` で以下を Vercel Cron Jobs に登録済み:
- [x] `POST /api/cron/expire-jobs` — 毎日 03:00 UTC
- [x] `POST /api/cron/hellowork-import?pages=5` — 毎時 0 分
- [x] `POST /api/cron/saved-search-alerts` — 毎日 09:00 UTC
- [x] `POST /api/cron/refresh-gbiz` — **毎月 1 日 03:00 UTC（GbizINFO 月次更新）**
- [x] 環境変数 `CRON_SECRET` を Vercel に設定（2026-05-21 完了）
- 各 Cron には `Authorization: Bearer ${CRON_SECRET}` を Vercel が自動付与

### 6. Google Search Console 登録 ✅ 済

- [x] サイト追加 + 所有権確認 (2026-05-21 完了)
- [ ] **リリース直前の最終チェック項目**:
  - [ ] `https://www.genbacareer.jp/sitemap.xml` の最新求人が反映されているか
  - [ ] Indexed Pages 数の推移 (リリース後の追跡)
  - [ ] Coverage Report で 404 / Soft 404 が発生していないか
  - [ ] Core Web Vitals (LCP / CLS / INP) のスコア

---

## 🟡 中優先（リリース後 1 週間以内）

### 7-pre. Playwright E2E スモークテストを 1 回実行

PR #103 で `e2e/` 配下にスモークテストを追加済み。初回のみブラウザバイナリ取得が必要:

```bash
pnpm test:e2e:install   # Chromium バイナリを取得 (初回のみ)
pnpm dev                # 別ターミナルで dev サーバ
pnpm test:e2e           # 全テスト実行
pnpm test:e2e:ui        # UI モード（ステップ追跡）
```

CI でも実行したい場合は `PLAYWRIGHT_BASE_URL=https://genbacareer.jp pnpm test:e2e` で本番に対しても回せます。

### 7. Google Analytics 4 / Vercel Analytics 接続確認 ✅ 済

- [x] `NEXT_PUBLIC_GA_ID` 設定 + 動作確認 (2026-05-21 完了)
- [x] Vercel Analytics 動作確認

### 8. LINE 公式アカウント連携

- [ ] LINE Developers で Messaging API 設定
- [ ] Webhook URL を `https://genbacareer.jp/api/line/webhook` に設定
- [ ] チャネルアクセストークン / シークレットを `LINE_CHANNEL_*` に
- [ ] リッチメニュー登録: `pnpm tsx scripts/setup-line-rich-menu.ts`

### 9. MoneyForward クラウド請求書 連携（成果報酬の請求書発行）

採用 1 件あたり成果報酬 ¥498,000〜（職種による）を MoneyForward クラウド請求書で発行する設計。
**月額サブスクリプションは使いません**（コードも対応済み）。
**Stripe カード決済は 2026-05 PR #204 で廃止済み**（景品表示法対応の方針見直しに伴う）。

- [ ] MoneyForward クラウド請求書アカウント作成 + 事業者情報設定
- [ ] OAuth2 Client 設定（B2B 用途、Client Credentials Grant）
- [ ] `MF_CLIENT_ID` / `MF_CLIENT_SECRET` / `MF_OFFICE_ID` を Vercel に設定
- [ ] テスト用取引先で billing 作成 → PDF 発行確認
- [ ] 環境変数未設定時は admin 手動 invoice 発行運用にフォールバック可能

### 10. Sentry プロジェクト作成

- [ ] sentry.io でプロジェクト作成（Next.js）
- [ ] `SENTRY_DSN` `SENTRY_ORG` `SENTRY_PROJECT` `SENTRY_AUTH_TOKEN` を Vercel に
- [ ] アラートルール: error rate > 1% で Slack / メール通知

---

## 🟢 低優先（リリース後 1 ヶ月以内）

### 11. メール送信（Gmail SMTP）設定

`genbacareer@let-inc.net` を Workspace アカウントとして nodemailer 経由で送信。

- [ ] https://myaccount.google.com/security で **2 段階認証を有効化**（必須）
- [ ] https://myaccount.google.com/apppasswords で **アプリパスワード**を発行（16 桁）
- [ ] Vercel 環境変数:
  - `SMTP_USER=genbacareer@let-inc.net`
  - `SMTP_PASS=xxxx xxxx xxxx xxxx`（16 桁、空白あり）
  - `MAIL_FROM="ゲンバキャリア <genbacareer@let-inc.net>"`（任意）
- [ ] テスト: signup / 応募完了 / スカウト受信メールが届くか確認

送信枠: Workspace 2,000 通/日。これを超える運用になれば SES / SendGrid 等を別途検討。

### 12. PWA アイコン / OGP 画像の最終版

- [ ] `/icon` `/apple-icon` `/opengraph-image` が現在は動的生成
- [ ] 必要に応じてデザイナーから受け取った PNG を `public/` に置き、`src/app/icon.tsx` をシンプルにする

### 13. 法務テキストの最終チェック

- [ ] `/terms` `/privacy` `/legal` の文言を顧問弁護士確認
- [ ] 退会後のデータ保持期間を明文化

### 14. 求人 / 企業の本番データ投入

- [ ] 直接掲載企業の最初の数社分のデータ手動入力
- [ ] HelloWork API からの自動取り込み起動確認

---

## 🆕 口コミ重複投稿防止 (2026-09-10 追加)

不正レビュー対策として `CompanyReview` に `@@unique([companyId, userId])` を追加（ログイン済みユーザーは同一企業への口コミを 1 件までに制限。匿名投稿は引き続き無制限）。

- [ ] **本番 DB にスキーマ反映**:
  ```bash
  pnpm prisma db push
  ```
  事前確認（重複が既にある場合は db push が失敗するので先に手動で整理）:
  ```sql
  SELECT company_id, user_id, COUNT(*) FROM company_reviews
  WHERE user_id IS NOT NULL GROUP BY company_id, user_id HAVING COUNT(*) > 1;
  ```

---

## 🆕 MoneyForward 請求書の税区分 要確認 (2026-09-10 追加)

`src/lib/moneyforward.ts` の `createMfBilling` で、`unit_price` に渡す金額（成果報酬 ¥498,000〜 等）が MF 側で「税抜」として扱われ 10% 上乗せされるのか、「税込」総額としてそのまま請求されるのかが未検証（コード内のコメントと JSDoc が矛盾していたのを修正済みだが、実際の挙動は未確認）。

- [ ] MoneyForward サンドボックス or 本番で 1 件テスト請求書を発行し、PDF の合計金額が意図通り（社外に案内している ¥498,000 と一致する側）か確認
- [ ] ズレていた場合、`unit_price` に渡す金額を調整するか `excise` の値を変更

---

## 🆕 登録ウィザードの回答保存漏れ修正 (2026-09-10 追加)

`/register/wizard` の必須ステップ（経験職種・年数、希望条件）で回答させていた
`experiencedCategories` / `experiencedSubcategories` / `experienceYears` /
`companyCount` / `desiredPrefectures` / `desiredTransferTiming` が、
User 作成時に一切保存されず破棄されていた（専用カラムが存在しなかったため）。
`User.wizardAnswers` (Json) を追加し保存するよう修正。

- [ ] **本番 DB にスキーマ反映**:
  ```bash
  pnpm prisma db push
  ```

---

## 🆕 TOTP リプレイ攻撃防止 (2026-09-10 追加)

`CompanyUser.totpLastUsedStep` を追加し、2FA コードの使い回し（同じ/古い
タイムステップの再利用）をログイン時に拒否するよう修正
（otplib v13 のネイティブ `afterTimeStep` 機能を使用）。

- [ ] **本番 DB にスキーマ反映**:
  ```bash
  pnpm prisma db push
  ```

---

## 🆕 記事の旧ブランド名修正 (2026-09-10 追加、本文まで拡大対応)

`prisma/seed-data/` 配下で旧ブランド名「建設求人ポータル」が使われていた箇所を
「ゲンバキャリア」に修正:
- `seed-articles.ts` の `authorName`（「建設求人ポータル編集部」）
- `seed-articles.ts` のプレースホルダー本文生成部
- `prisma/seed-data/articles/*.html`（199 ファイル / 計 398 箇所、記事本文
  末尾の「建設求人ポータルでは、〜求人を掲載しています」という定型文）

- [ ] 本番 DB に既に seed 済みの記事がある場合、以下で一括修正:
  ```sql
  UPDATE articles SET author_name = 'ゲンバキャリア編集部'
  WHERE author_name = '建設求人ポータル編集部';

  UPDATE articles SET body = REPLACE(body, '建設求人ポータル', 'ゲンバキャリア')
  WHERE body LIKE '%建設求人ポータル%';
  ```

---

## 📋 すでに完了済み

参考: 直近のセッションで完了した手作業:
- ✅ Supabase Pro プランへアップグレード
- ✅ `DIRECT_URL` を Session pooler URL に設定（pgbouncer 対応）
- ✅ `pnpm prisma db push` でスキーマ同期
- ✅ Materialized View 投入（`job_category_counts` / `job_pref_category_counts`）

---

## このファイルの更新

新しい手作業項目が発生したら、上記カテゴリに沿って追加してください。
私（Claude）への指示時には「RELEASE_TODO.md の N 番」と参照すると話が早いです。

---

## 🆕 Indeed 連携 Phase A (2026-05-21 追加)

詳細仕様は `docs/indeed-integration.md` 参照。

### 実装済み (PR #212)
- `/jobs.xml` ルート (Indeed 公式 XML フィード仕様準拠)
- 配信対象: direct + active + 課金プラン (campaign_free 除外)
- 最大 5,000 件 / 1 時間キャッシュ
- 単体テスト 21 件

### マージ後の手動作業 (Indeed 側)
- [ ] Indeed for Employers ダッシュボードでログイン
  - https://employers.indeed.com/
- [ ] 「Source Posting」または「XML Feed」設定を開く
- [ ] Feed URL = `https://www.genbacareer.jp/jobs.xml` を登録
- [ ] Refresh schedule = Daily に設定
- [ ] 初回 Indeed 側検証 (1-3 営業日) 待ち
- [ ] Active になったことを確認 → indeed.com 検索で求人タイトル等で表示されるか確認

### Phase B: Indeed Apply 連携 (リリース後対応)

- Indeed Apply API 利用申請 (約 1-2 ヶ月のリードタイム)
- 応募データ Webhook 受け取り → Application モデルに自動レコード作成
- Indeed 側の Apply ボタン表示審査

---

## 🆕 求人ボックス / スタンバイ 連携 (2026-05-21 追加)

詳細は `docs/job-feeds.md` 参照。コード側は実装済み (PR #218 周辺)。

### 実装済み
- `/jobs.xml?source=kyujinbox` (求人ボックス向け、UTM 自動付与)
- `/jobs.xml?source=stanby` (スタンバイ向け、UTM 自動付与)
- Indeed 互換 XML 仕様で両プラットフォーム対応

### 手動作業 — 商談ベース (即日登録不可、リードタイム 2-4 週間)

#### 求人ボックス (カカクコム)
- [ ] https://corp.kakaku.com/service/job/ の問い合わせフォーム送信
- [ ] 連絡先・フィード URL を提示:
  - フィード URL: `https://www.genbacareer.jp/jobs.xml?source=kyujinbox`
  - 会社: 株式会社LET / 27-ユ-304693
- [ ] 担当者から返信 (3-5 営業日) → 営業 MTG → 審査 → 掲載開始
- [ ] 料金: クリック課金 (CPC) 25〜200 円想定

#### スタンバイ (Visional)
- [ ] https://corporate.stanby.co.jp/ の問い合わせフォーム送信
- [ ] 連絡先・フィード URL を提示:
  - フィード URL: `https://www.genbacareer.jp/jobs.xml?source=stanby`
  - 会社: 株式会社LET / 27-ユ-304693
- [ ] 担当者から返信 (3-5 営業日) → 審査 → 掲載開始
- [ ] 料金: 無料掲載 + 有料オプション (上位表示 CPC)

### 連携完了後の確認
- [ ] GA4 で `source/medium = kyujinbox / feed`、`stanby / feed` の流入を計測
- [ ] 月次レポートで CPA / 採用決定率を ROI 評価

---

## 🆕 スカウトメッセージ機能 (2026-05-21 追加)

PR #206 で実装。マイナビ転職参考のスカウトメール + 求職者受信トレイ + 企業送信フォーム。

### マージ後の手動作業
- [ ] **本番 DB に SQL 実行**:
  ```bash
  psql "$DIRECT_URL" -f prisma/migrations/manual/scout_messages.sql
  ```
  `prisma db push` で `scout_messages` テーブル自体は作られるが、partial unique index と CHECK 制約は manual SQL で別途定義する必要あり。
- [ ] Vercel Cron Jobs に `/api/cron/expire-scouts` が登録されているか確認 (vercel.json 反映後)
- [ ] スモークテスト: 企業 → 求職者にスカウト送信 → メール受信 → `/mypage/scouts/[id]` で既読確認

### 仕様メモ
- 有効期限: 30 日 (sentAt + 30d で auto expire)
- 件名: 固定書式 (企業はカスタマイズ不可)
- 本文: 20〜2,000 文字
- 再送制限: アクティブな (sent/read) スカウトが存在中は同じ求人で同じ求職者への再送不可、expired/declined 後は再送可
- 配信抑制: 求職者の `NotificationPrefs.scoutEnabled = false` でメール抑制 (サイト内通知は記録)

---

## 🛠 ビジネスモデル変更に伴う開発項目 (2026-05-21 追加)

詳細仕様は `docs/business-model-handover.md` 参照。

3 プラン制 (① 成果報酬 ¥498k〜 / ② 月額 12ヶ月 / ③ 月額 24ヶ月) + 特別枠 2 種 (キャンペーン¥0永年 / サクバズSNSクライアント) への構造変更に伴うコード変更タスク。

### C1. Stripe カード決済機能の廃止 【高】 ✅ PR #204 (2026-05-21)

成功報酬・月額掲載どちらも請求書払いに統一する。
- [x] `src/lib/billing.ts` から Stripe 分岐削除、MoneyForward 一本化
- [x] `src/app/api/webhooks/stripe/route.ts` 削除
- [x] `Company.paymentMethod` デフォルトを `moneyforward` に変更
- [ ] **環境変数 `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` を Vercel から削除** (手動作業残)
- [x] npm パッケージ `stripe` 削除 + lockfile 更新
- [x] /legal /privacy /faq /help-articles から Stripe 記述を除去 (PR #cleanup)

### C2. 月額掲載プラン (Subscription) の新規実装 【高】 ✅ 実装済み

- [x] `Company` に `planType` / `planPaidUntil` / `planActivatedAt` / `planPrepaidFull` / `planTier` / `planNotes` / `planExpiryNotifiedAt` カラム追加 (`prisma/migrations/manual/company_plan_columns.sql`)
- [x] `src/lib/plans.ts` でドメインロジック (PlanType / planTier / isPlanActive / canPostJob 等) を一元化
- [x] `/admin/companies/[id]` の `PlanEditor` で plan_type / paid_until / activated_at / prepaid_full / notes を編集可能
- [x] 期間満了前 30 日通知 cron (`/api/cron/plan-expiry-notice`, 04:00 UTC)
- [x] **満了後の planTier 降格 cron (`/api/cron/expire-plans`, 05:00 UTC)** ← PR #222 で追加
- [x] 単体テスト `src/__tests__/lib/plans.test.ts` + `src/__tests__/api/cron-expire-plans.test.ts`

### C3. 戻入処理 (refund) の実装 【中】 ✅ 実装済み

- [x] `EarlyResignation` モデル (jobId, applicationId, resignedAt, monthsAfterHire 等) を schema に追加
- [x] manual SQL `prisma/migrations/manual/early_resignations.sql`
- [x] 企業向け早期退職報告 UI
- [x] `/admin/early-resignations` で admin 承認フロー (reported → approved → invoiced / rejected)
- [x] 返金率自動計算 (1m: 80% / 2m: 50% / 3m: 20%)、`Application.hiredAt` を基準
- [x] `/admin/billing-todo` で credit note 発行待ちを一覧表示

### C4. hiring_fee_amount レンジ変更 【中】 ✅ PR #204 (2026-05-21)

- [x] `src/lib/hiring-fee.ts` の `HIRING_FEE_MIN` を `200_000` → `498_000` に変更
- [x] 新規 SQL `prisma/migrations/manual/jobs_hiring_fee_amount_range_498k.sql` 追加
- [ ] **本番 DB に SQL 実行** (手動作業残):
  ```bash
  psql "$DIRECT_URL" -f prisma/migrations/manual/jobs_hiring_fee_amount_range_498k.sql
  ```
  事前確認:
  ```sql
  SELECT id, title, hiring_fee_amount FROM jobs
  WHERE hiring_fee_amount IS NOT NULL AND hiring_fee_amount < 498000;
  ```

### C5. 採用ボーナス ¥50k 固定 + 適用プラン制限 【中】 ✅ 実装済み

- [x] `src/lib/hiring-bonus.ts` で `HIRING_BONUS_AMOUNT = 50_000` 固定
- [x] `isPlanEligibleForBonus(planType)` で `monthly_12 / monthly_24 / sns_client` のみ true
- [x] `HiringBonusRequestButton` で対象外プランの企業では非表示
- [x] `/admin/hiring-bonuses` で申請ワークフロー (requested → approved → paid / rejected)
- [x] 単体テスト `src/__tests__/lib/hiring-bonus.test.ts`

### C6. キャンペーン枠フラグの実装 【低】 ✅ 実装済み

- [x] `PLAN_TYPES` に `campaign_free` を追加 (`src/lib/plans.ts`)
- [x] `planTier('campaign_free')` → 1 (SNS よりは下、HW より上)
- [x] `isPlanActive('campaign_free')` → 期限なし、常に true
- [x] `/admin/companies/[id]` の `PlanEditor` から選択可能

### C7. サクバズ SNS フラグの実装 【低】 ✅ 実装済み

- [x] `PLAN_TYPES` に `sns_client` を追加
- [x] `planTier('sns_client')` → 2 (paid 平等枠の下、キャンペーンの上)
- [x] `isPlanEligibleForBonus('sns_client')` → 採用ボーナス対象
- [x] `canSendScoutByPlan('sns_client')` → スカウト送信可
- [x] `/admin/companies/[id]` の `PlanEditor` から選択可能

### C8. 上位表示優先ロジックの実装 【中】 ✅ 実装済み

- [x] `/jobs` の orderBy で `company.planTier desc → company.rotationKey asc → rankScore desc → publishedAt desc` (`src/app/jobs/page.tsx`)
- [x] `rotationKey` の日次更新 cron (`/api/cron/rotate-companies`, 03:30 UTC) で paid 平等枠の機会均等を実現
- [x] tier mapping: paid (success_fee / monthly_12 / monthly_24) = 3, sns_client = 2, campaign_free = 1, HW = 0

  ※ RELEASE_TODO 初版にあった「6 ヶ月間はキャンペーンを最上位で運用」のロジック切替は admin から手動で `planTier` を上書き運用 (`PlanEditor.planNotes` で履歴残す)。コード固定にはしない。

### C9. 一括前払い 10% OFF の請求書発行ロジック 【中】

- ② 12 ヶ月 → ¥597,600 を一括 → 10% OFF → ¥537,840 請求書 1 通
- ③ 24 ヶ月 → ¥720,000 を一括 → 10% OFF → ¥648,000 請求書 1 通
- 分割契約と一括前払いを `CompanyPlan.prepaid_full` で識別
- MoneyForward 連携部分で一括前払い用テンプレートを追加

### C10. 利用規約 / プラン詳細ページの更新 【高】 ⏳ 一部 PR #204

- [x] `/for-employers` (企業向け LP) のプラン比較表を 3 プラン制に更新 (PR #204)
- [x] `/for-employers` に 3 プラン詳細カードセクション追加 (PR #204)
- [ ] **`/legal/terms` (利用規約) に以下を追記** (弁護士確認必要):
  - 戻入規定 (① プランのみ、1m 80%/2m 50%/3m 20%、入社日基準)
  - 中途解約不可条項 (② ③ 月額プラン)
  - 採用ボーナス支給条件 (②③ + サクバズ SNS のみ)
- [ ] **特定商取引法表記 (`/legal`) を月額プラン対応に** (弁護士確認必要)
- [ ] **`/privacy` (プライバシーポリシー) の委託先記述見直し** (弁護士確認必要)

