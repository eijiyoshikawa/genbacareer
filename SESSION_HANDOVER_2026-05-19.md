# セッション引き継ぎノート — 2026-05-19

## 今回のセッションで完了したこと

- 管理者ログイン問題の完全解決（ADMIN_EMAILS タイポ、AUTH_SECRET 欠落、NEXTAUTH_URL ドメイン不整合、signIn callback の role 上書きバグ）
- 本番 504/500 障害対策（sitemap の全件取得→5000件制限、スキャナ probe を Edge で即 404、try/catch フォールバック）
- 管理画面ダッシュボードを Suspense ストリーミング化、シェル即時表示
- 全画面ローダー追加（`/jobs`, `/jobs/[id]`, `/mypage`）— ブランドオレンジの回転リング + 中央ロゴ + 下部プログレスバー
- 管理者複数対応（DB ベース AdminUser テーブル + ENV 併用、`/admin/admins` 管理 UI）
- マニュアル整備（`/admin/manual`, `/company/help`）
- ロゴ画像 (`/public/logo-demo.jpg`) を favicon / apple-icon / OGP / PWA manifest / ヘッダー / 全画面ローダーに統一適用
- トップページタイトル統一（`ゲンバキャリア | 建設業界特化型求人サイト`）
- 旧バグで作成された User レコード削除（Supabase 直叩き）

PR #123 (`claude/sentry-setup-deployment-hL1OS` → `main`) に集約済み。

---

## 次セッションのタスク一覧（優先順）

### A. Google Search Console エラーの修復

GSC でレポートされているクロール/インデックスエラーを潰す。
着手前に以下を確認してから対応:

- Search Console → カバレッジ → 除外/エラー詳細
- 主な観点:
  - 404 が大量発生していないか（旧 URL からのリダイレクトが必要か）
  - canonical URL の整合性（www / 非 www、末尾スラッシュ）
  - robots.txt と meta robots の不整合
  - 構造化データのエラー（JobPosting / Organization）
  - サイトマップ index 化（現在 5000 件制限のため大規模 SEO に未対応）

GSC のスクショ or エクスポート CSV を共有してもらえれば、こちらで具体策に落とす。

### B. サイトの読み込み速度改善

体感速度 + Core Web Vitals (LCP / INP / CLS) の両方を改善する。

検討項目:

- DB クエリ最適化
  - `prisma.job.count()` 系を materialized view or count キャッシュに置き換え
  - 一覧画面の N+1 を `_count` リレーション化
  - Supabase の `pg_stat_statements` で TOP 10 重いクエリを特定
- ISR / キャッシュ
  - `/[prefecture]`, `/[prefecture]/[category]`, `/jobs/[id]` の revalidate を再評価
  - `unstable_cache` でセッション横断キャッシュ
- 画像最適化
  - 画像 CDN (Cloudinary / Vercel Image Optimization) で `next/image` パラメータ調整
  - LCP 候補画像に `priority` を付ける
  - WebP / AVIF 配信
- バンドルサイズ
  - `@phosphor-icons/react` を dynamic import 化
  - サードパーティ JS (GA, Analytics) を Partytown / Web Worker 化
- インフラ
  - DATABASE_URL に `connection_limit=1&pgbouncer=true` 推奨パラメータ確認
  - Edge Middleware の処理を軽量化

### C. 各画面の機能追加・デザインチェック

具体的な要望は未確定。次セッション冒頭で:

- どの画面（/jobs, /jobs/[id], /mypage, /company/*, /admin/* …）
- 機能追加 or デザイン調整 のいずれか
- 優先順位

を明確化して着手。

### D. 現時点で完了していないタスク

- ファビコン / ロゴ画像 (`/public/logo-demo.jpg`) のリポジトリへの追加
  - ローカルでは public/ に置いてあるが git に commit & push が必要
- Vercel 初期テンプレ SVG (`public/{vercel,next,file,globe,window}.svg`) の削除
- PR #123 の main へのマージ（Vercel での Promote とは別に GitHub 上での merge）

### E. iOS / Android アプリ化（A〜D が安定してから着手）

#### 方針の選択肢

| 方式 | 工数 | UX | 推奨度 |
|---|---|---|---|
| **PWA を強化** | 小 | 70点 | ✅ MVP に最適 |
| **Capacitor で WebView ラップ** | 中 | 80点 | ✅ App Store / Play Store 配信したい場合 |
| **React Native へ移植** | 大 | 95点 | ⚠ 長期的に必要なら |

#### 推奨手順（Capacitor 方式）

1. PWA の最適化を完了させる
   - manifest.webmanifest の icons / start_url 確認
   - service worker でオフライン対応（最低限）
   - install プロンプト最適化
2. Capacitor 導入
   ```bash
   pnpm add -D @capacitor/cli @capacitor/core @capacitor/ios @capacitor/android
   pnpm exec cap init "ゲンバキャリア" jp.genbacareer.app --web-dir=out
   ```
3. Next.js の静的エクスポート設定
   - `next.config.ts` に `output: 'export'` 追加（または既存サーバを WebView から開く方式に変更）
   - 動的ルートのフォールバックを SSR 不要にする
4. ネイティブプロジェクト生成
   ```bash
   pnpm exec cap add ios
   pnpm exec cap add android
   ```
5. プラットフォーム個別作業
   - **iOS**: Xcode で Bundle ID, 証明書, Push 通知設定
   - **Android**: Android Studio で applicationId, keystore, FCM 設定
6. ストア申請
   - **App Store**: Apple Developer Program 加入 (年 99 USD)、スクショ・プライバシーラベル準備
   - **Google Play**: Developer Console 登録 (一回 25 USD)、データセーフティ申告

#### 推奨される事前準備

- ロゴアイコン 1024x1024 PNG（角丸無し、透過なし）を `public/app-icon-1024.png` に配置
- スプラッシュ画像 2732x2732 PNG を `public/splash.png` に配置
- App Store / Play Store の説明文・スクショ案を Notion 等に下書き

---

## 着手時の Tips

- セッション開始時に `git pull origin main` してから claude branch を最新化
- 環境変数: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, `AUTH_SECRET`, `NEXTAUTH_URL` は本番設定済み
- 管理者ログイン: `https://www.genbacareer.jp/admin/login` (eiyoshi99@gmail.com / eiji17252380yoshikawa)
- マニュアル: 管理画面サイドバーの「運用マニュアル」を参照

---

## 持ち越し事項チェックリスト

- [ ] PR #123 を main にマージ
- [ ] `public/logo-demo.jpg` を git に commit & push
- [ ] `public/{vercel,next,file,globe,window}.svg` を削除
- [ ] GSC エラーの内容を共有
- [ ] サイト速度の現状計測（PageSpeed Insights / WebPageTest）
- [ ] 機能追加 / デザイン調整の対象画面を確定
