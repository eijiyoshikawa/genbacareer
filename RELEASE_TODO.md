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
- [ ] 環境変数 `CRON_SECRET` を Vercel に設定（未設定だと認証スキップで誰でも叩ける）
- 各 Cron には `Authorization: Bearer ${CRON_SECRET}` を Vercel が自動付与

### 6. Google Search Console 登録

- [ ] https://search.google.com/search-console から `genbacareer.jp` を追加
- [ ] DNS TXT レコードまたは HTML タグで所有権確認
- [ ] `https://genbacareer.jp/sitemap.xml` を Sitemap 送信
- [ ] `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` を Vercel 環境変数に追加（HTML タグ方式の場合）

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

### 7. Google Analytics 4 / Vercel Analytics 接続確認

- [ ] `NEXT_PUBLIC_GA_ID` を Vercel に設定（既存の `<GoogleAnalytics />` が読む）
- [ ] Cookie 同意バナーで「すべて受け入れる」を選択 → GA リアルタイムレポートで自身を確認
- [ ] Vercel → Analytics タブで PV / Web Vitals が記録され始めているか確認

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

### C2. 月額掲載プラン (Subscription) の新規実装 【高】

- 新規モデル: `CompanyPlan` (type: `monthly_12` / `monthly_24` / `success_fee` / `campaign_free` / `sns_client`)
- `paid_until: DateTime` カラムで契約終了日管理
- `prepaid_full: Boolean` で一括前払いフラグ
- 中途解約不可ルール (UI 上でも操作不可に)
- 期間満了前 30 日通知 cron

### C3. 戻入処理 (refund) の実装 【中】

- `EarlyResignation` モデル (jobId, applicationId, resignedAt, monthsAfterHire)
- 通知 UI: 企業が早期退職を報告する画面
- 自動部分返金 invoice 発行 (1m: 80% / 2m: 50% / 3m: 20%)
- 計算基準は `Application.hiredAt` (入社日 = hiredAt と同じ扱い)
- admin 承認フロー

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

### C5. 採用ボーナス ¥50k 固定 + 適用プラン制限 【中】

- `HiringBonus.amount` を `¥50,000` 固定 (admin 設定で可変も維持)
- 適用対象 = `Company.plan_type IN ('monthly_12', 'monthly_24', 'sns_client')` のみ
- ① 成果報酬 / キャンペーン (`campaign_free`) では `HiringBonus` レコード作成不可 (UI 上で隠す)

### C6. キャンペーン枠フラグの実装 【低】

- `Company.plan_type = 'campaign_free'` を追加 (C2 と同時実装が望ましい)
- 掲載期間: 無期限 (将来 `campaign_until` カラム検討)

### C7. サクバズ SNS フラグの実装 【低】

- `Company.plan_type = 'sns_client'` を追加 (C2 と同時)
- サクバズ SNS の契約と紐付け管理 (admin 手動 OK)

### C8. 上位表示優先ロジックの実装 【中】

`/jobs` の orderBy で以下の優先順位を実装:
```
1. 有償平等枠 (① / ② / ③) → ランダム or 公平
2. SNS 枠 (sns_client)
3. キャンペーン枠 (campaign_free)
```
リリース後 6 ヶ月間は逆順 (キャンペーンが最上位) で運用 → 6 ヶ月後にロジック切替。

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

