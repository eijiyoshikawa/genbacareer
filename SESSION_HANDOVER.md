# セッション引き継ぎノート (最終更新 2026-05-19 午後)

新しい Claude Code セッションを開始するときに、このファイルを最初に読むよう指示してください。
プロジェクト全体の経緯と、未完了の作業が把握できます。

---

## 2026-05-19 午後セッションで完了したこと (PR #124〜#128 + 直 push 1 件)

### サマリー
| PR | テーマ | 本番反映 |
|---|---|---|
| #124 | PageSpeed mobile 改善 4 Phase (font / 画像 / 未使用 CSS / a11y) | ✅ |
| #125 | ensureSchema fire-and-forget + hnd1 region + analytics consent gate | ✅ |
| #126 | ホーム ISR 24h + /api/cron/warmup (5 分おき) で常時ホット化 | ✅ |
| #127 | logo-demo.jpg を favicon / OG / Organization に統一 | ✅ |
| #128 | sitemap GSC 修正 (件数上限 + try/catch + ISR) + *.vercel.app canonical 集約 | ✅ |
| (直 push) | Supabase statement_timeout 対策 (withTimeout 8s) | ⏸ 次回 push 時に反映 |

### PageSpeed の変化
| 指標 | 開始時 | 1 回目計測 | 備考 |
|---|---|---|---|
| Performance | 61 | **75** (Best) / 59 (Worst) | 振れ幅は cold lambda 起因 |
| Accessibility | 93 | **97** | a11y 強化が効いた |
| FCP | 6.0s | **1.8s** (warm) | warmup cron 後は安定するはず |
| LCP | 8.0s | 6.8s | 改善余地あり |

### 検索ロゴ反映
- favicon (logo-demo.jpg) を全エンドポイントに統一済 ✅
- ブラウザタブ即時、SNS 数日、Google 検索 1〜2 週後に反映予定
- GSC で URL 再インデックスリクエスト済

### let-kyujin.vercel.app の検索結果排除
- middleware で 301 redirect → genbacareer.jp に集約 ✅
- 自然 de-index は 2〜4 週間
- 加速したい場合: Google「古いコンテンツの削除ツール」
  https://search.google.com/search-console/remove-outdated-content

### 既知の運用ポイント
- **Vercel ビルドは Supabase が一時的に遅いと失敗する**
  → withTimeout (8s) 対策で次回 push 以降は耐性あり
  → 万一またコケたら **空 commit を main に push** して再ビルドが最速
- **Promote はユーザー操作必須** (自動 promote が未設定)
  → 設定手順は本ファイル末尾の「Vercel 自動 promote 化」セクション参照

---

## 2026-05-19 午前セッション (旧記録、参考)

### PageSpeed Insights 改善 (PR #123 / branch claude/pending-content-G2KNe)
モバイル計測値: Performance **61** / Acc **93** / BP **100** / SEO **100** から改善着手。
FCP 6.0s / LCP 8.0s / TBT 0ms / CLS 0 → 主犯はレンダリングブロック (推定 6,600ms)。

#### Phase 1 — レンダリングブロック軽減
- `src/app/layout.tsx`: Noto Sans JP のウェイトを `["400","500","700","900"]` → `["400","500","700"]` に削減
  - 900 (font-black) は 700 で合成。font-extrabold/black の使用は 29 箇所のみ
- `next.config.ts`: `experimental.optimizePackageImports` に `lucide-react` と `@phosphor-icons/react` を追加
  - 名前付き import から個別 import への自動変換でツリーシェイク強化

#### Phase 2 — 画像配信改善 (推定 -120 KiB)
- Hero 画像: `w=2000&q=80` → `w=1600&q=70` (opacity:0.55 で重ねるため劣化なし)
- Feature Banner 3 枚: `w=1200&q=75` → `w=1000&q=70`

#### Phase 3 — 未使用 CSS 削除
- `src/app/globals.css` から 6 クラス (約 50 行) 削除:
  `hero-overlay` / `hero-rail-right` / `section-dots` / `section-warm` /
  `theme-band-yellow` / `search-band-yellow`

#### Phase 4 — アクセシビリティ
- `src/app/layout.tsx`: Skip-to-main-content リンク追加 (`#main-content` へ)
- `src/app/page.tsx`: `text-gray-400` の本文を 500/600 に。インライン link に underline 追加
- `src/components/layout/header.tsx`: 「企業の方」リンクを `text-gray-500` → `gray-600` (AA 余裕)
- `src/components/layout/footer.tsx`: dark bg 上の小さな文字を `gray-500` → `gray-400`
- `src/components/contact-form.tsx`: `<label>` を input ラップ型に変更 (SR の関連付け)、charcount 色補正

### バンドル分析の準備
- `@next/bundle-analyzer` を devDependencies に追加
- `pnpm analyze` (= `ANALYZE=true next build`) で `.next/analyze` に可視化 HTML 出力
- `next.config.ts` を `withBundleAnalyzer(...)` でラップ済み

### PR #121 / #122 (2026-05-13 以降)
- #121: SESSION_HANDOVER.md 初版
- #122: 企業ログイン情報発行フロー + /admin/login 分離 + 未登録ゲート
  - ハンドオーバー旧版 🟡-6 の「企業 ID/PASS admin 発行フロー」は完了

---

## 2026-05-13 セッションで完了したこと

### 1. ブランド / デザイン整備（PR #95–#96）
- 共通 UI コンポーネント `<Section>` `<Button>` 作成（`src/components/ui/`）
- Header を Server Component 化（モバイルメニューだけ Client）
- Hero ファーストビュー強化（検索フォームの白パネル + クイックチップ 5 種）
- Footer ボタン統一、SNS アイコン拡大
- 極小フォント `text-[10px]` `text-[11px]` 全 94 箇所を `text-xs` に統一

### 2. スクレイピング / セキュリティ対策（PR #97 / #110 / #111）
- `robots.txt` で AI クローラ 25 種を Disallow（GPTBot / ClaudeBot / Google-Extended など）
- middleware で `curl` `python-requests` `Go-http-client` 等の bot UA を 403
- 公開 API 全て rate-limit 化（`/api/jobs` 90req/min, `/api/jobs/[id]` 60req/min など）
- `X-Robots-Tag: noarchive` で Wayback Machine から退避
- セキュリティヘッダ全部入り (HSTS / X-Frame-Options / CSP / Permissions-Policy)
- 認証 endpoints に rate-limit (10 attempts / 15 min)
- Open Redirect 防御 (`auth.ts` の `redirect` callback)
- お問い合わせフォームに honeypot

### 3. SEO / Core Web Vitals（PR #100 / #102 / #109）
- **Google for Jobs 完全対応** — JobPosting JSON-LD 強化、必須・推奨フィールド網羅
- 構造化データ: `identifier` / `applicantLocationRequirements` / `qualifications` / `keywords` / `jobBenefits` 追加
- HelloWork 由来の構造化データも同等水準に
- Header の `"use client"` 削除（モバイルメニューだけ別 Client）
- Feature Banner の 1 番目だけ `priority`、他は `loading="lazy"`
- `RecommendedForYou` に 2s タイムアウト
- canonical URL を主要 6 ページに設定
- `/api/health?full=1` エンドポイント強化（DB ping + env vars + deploy info）

### 4. UX / エラー処理（PR #101 / #112 / #118）
- 404 ページに人気カテゴリ・都道府県の導線追加
- 検索 0 件時の `<EmptyJobsState>` 新設（条件緩和提案 + 最新求人 6 件 SSR）
- 画像アップロード: magic byte 検証 + サイズ制限 + 拡張子安全化
- 求人編集の楽観ロック（`expectedUpdatedAt` で同時編集検出 → 409）
- スケジューリング URL の厳格化（HTTPS のみ、private IP 拒否）
- 退会フロー: ApplicationMessageTemplate 削除追加 + 「退会済みユーザー」表示

### 5. GbizINFO 統合（PR #98 / #105 / #106 / #107）
- **完全実装**: 法人番号入力 → 自動取り込み → 求人カードに「✓ 建設業許可」バッジ
- `/company/gbizinfo` 管理画面（取込 / 再取得 / 削除）
- `/companies/[id]` 公開ページに公式データセクション
- 月次自動再取得 Cron `/api/cron/refresh-gbiz`（毎月 1 日 03:00 UTC）
- 法人番号未登録時のリマインドバナー（dashboard / 求人投稿画面）
- ライブラリ `src/lib/gbizinfo.ts` 完備

### 6. コンプライアンス（PR #113 / #117）
- 求人広告の差別表現検出 `src/lib/job-compliance.ts`
  - 雇用対策法 / 男女雇用機会均等法 / 職業安定法 違反パターンを正規表現で検出
- JobWizard 内でリアルタイム警告 `<ComplianceWarnings>`
- `/api/users/me/export` — 個人データの JSON エクスポート（個人情報保護法 第 33 条 / GDPR 第 15 条）
- プライバシーポリシー大幅補強（保管期間 / 越境移転 / 業務委託先 / データ可搬性）
- 利用規約大幅補強（成果報酬モデル明記 / スクレイピング禁止 / 退会条文）

### 7. メール送信（PR #114 / #115）
- Resend / SendGrid → **Gmail SMTP (nodemailer)** に切替
- env vars: `SMTP_USER` / `SMTP_PASS` / `MAIL_FROM`
- Stripe は **既存実装が成果報酬 + Invoicing** 設計だったので、ドキュメントのみ整理

### 8. テスト・運用ツール（PR #103 / #108 / #116 / #119 / #120）
- **Playwright E2E** 整備（5 spec / Chromium + Pixel 7）
- スクリプト群:
  - `pnpm gen:secret` — シークレット生成
  - `pnpm check:env [--env=production]` — env 検証
  - `pnpm preflight` — typecheck/lint/test/env/build を一括
  - `pnpm smoke` — 本番 smoke test (curl ベース)
- `/admin/status` — システム状態ダッシュボード
- `/api/admin/sentry-test` — Sentry 接続確認エンドポイント
- 初期 seed データ: 企業 5 社 + 求人 7 件 (`pnpm db:seed-companies` / `db:seed-jobs`)
- `LAUNCH_CHECKLIST.md` — リリース直前 13 セクション検証手順
- 単体テスト 127 → **149 passed (+22)**

---

## マージ済み PR 一覧（番号順）

| # | テーマ |
|---|---|
| 95 | デザイン Phase 1 (UI components / fonts / tap area) |
| 96 | デザイン Phase 2 (Hero / Section wrap / Footer) |
| 97 | スクレイピング防止 (robots.txt / UA ブロック / rate-limit) |
| 98 | GbizINFO 下準備 + RELEASE_TODO.md |
| 100 | Google for Jobs 構造化データ強化 |
| 101 | 404 / 検索 0 件ページの導線強化 |
| 102 | Core Web Vitals 改善 |
| 103 | Playwright E2E スモークテスト |
| 105 | GbizINFO 本実装 (UI + 詳細ページ) |
| 106 | GbizINFO follow-up (JobCard バッジ + 月次 Cron) |
| 107 | GbizINFO リマインダーバナー + 公開時ログ |
| 108 | preflight CLI 群 (gen:secret / check:env / preflight) |
| 109 | /api/health 強化 + canonical URL 整備 |
| 110 | セキュリティヘッダ + 認証 rate-limit + Open Redirect 防御 |
| 111 | 公開 API rate-limit 全面適用 |
| 112 | 企業側エラー検査強化 (magic byte / 楽観ロック / URL 厳格化) |
| 113 | 求人コンプラ警告 + 個人情報エクスポート |
| 114 | Gmail SMTP (nodemailer) 切替 |
| 115 | Stripe Invoicing 専用化 docs |
| 116 | admin/status + Sentry 接続テスト + smoke.sh |
| 117 | プライバシー / 利用規約 業界標準補強 |
| 118 | 退会フロー検証 + UI 文言修正 |
| 119 | 初期 seed データ (企業 5 社 + 求人 7 件) |
| 120 | LINE 署名検証ユニットテスト + LAUNCH_CHECKLIST.md |

---

## 環境変数 設定状況（前回時点）

### ✅ 設定済み（ユーザー報告）
- Supabase 一式 (`DATABASE_URL` / `DIRECT_URL` / `SUPABASE_*`)
- NextAuth 基本 (`NEXTAUTH_SECRET` / `NEXTAUTH_URL` / `NEXT_PUBLIC_BASE_URL`)
- `GBIZ_API_TOKEN`
- LINE Messaging API (`LINE_CHANNEL_*`)
- ドメイン (genbacareer.jp)

### 🟡 ユーザーが手動で残している（手順案内済み）
- `CRON_SECRET` (要 `pnpm gen:secret`)
- `ADMIN_EMAIL` / `ADMIN_PASSWORD_HASH` ← ユーザー側で完了報告あり
- `NEXT_PUBLIC_GA_ID = G-3KX8BLPXJZ` ← GA4 取得済み、Vercel 登録待ち
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_PROJECT` ← Sentry 取得済み
- `SENTRY_ORG` ← **ユーザー側で値を確認中**（前回ここで打ち止め）

### ⏸ 会議後の方針決定待ち
- **メール送信 (SMTP)**: Gmail Workspace + nodemailer の方向で実装済みだが、最終運用方針は会議後
- **Stripe Invoicing**: 月額課金なし・成果報酬請求書発行（実装済）、運用方針は会議後

### 📋 GSC は DNS で所有権確認済み
- `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` は **不要**（DNS 確認済みのため）

---

## 次のセッションで進めること（優先順）

### 🔴 最優先（リリース前 必須）
1. **`SENTRY_ORG` 値をユーザーから取得 → Vercel に登録**
2. **GSC: サイトマップ `https://genbacareer.jp/sitemap.xml` を送信**
3. **Vercel デプロイ後 `pnpm smoke` でセキュリティヘッダ等を最終確認**
4. **PageSpeed 再計測** (`https://pagespeed.web.dev/analysis/...?form_factor=mobile`)
   - 目標: Performance 61 → 80+ / Acc 93 → 98+
   - 期待効果: フォントウェイト削減 + 画像最適化 + 未使用 CSS 削除 + optimizePackageImports

### 🟠 会議後に方針確定したら
5. **メール送信 (SMTP)** の方針確定後、Gmail Workspace アプリパスワードを Vercel に
6. **Stripe Invoicing** の方針確定後、Stripe Dashboard 設定 + `STRIPE_*` env vars 登録

### 🟡 リリース後早めに
7. ~~企業 ID/PASS の admin 発行フロー~~ → **PR #122 で完了**
8. **`pnpm install` を回せる環境ができたら**:
   - `pnpm analyze` でバンドル可視化 → 重い import を特定
   - `pnpm test` / `pnpm lint` で今回の変更が壊していないか確認

### 🟢 リリース後ゆっくり
9. **法務最終確認**: terms / privacy / legal を顧問弁護士チェック
10. **本番企業データ投入** + サンプル企業（example.com URL）の `--reset` 削除
11. **Core Web Vitals 継続改善**:
    - DOM サイズ最適化 (PageSpeed 指摘)
    - 「強制リフロー」「メインスレッド長時間タスク 3 件」の特定 (DevTools Performance)
    - 残り「使用していない JS −27 KiB / CSS −33 KiB / レガシー JS −14 KiB」

---

## 重要ファイル / コマンド早見表

### ドキュメント
- `RELEASE_TODO.md` — 手作業項目チェックリスト
- `LAUNCH_CHECKLIST.md` — リリース直前検証手順
- `CLAUDE.md` — プロジェクト全体ルール
- `eijiyoshikawa/agents/agents/tech_lead/architecture_xwork_clone.json` — アーキテクチャ設計

### スクリプト (`package.json`)
```bash
pnpm dev                    # 開発サーバ
pnpm build                  # 本番ビルド
pnpm test                   # vitest
pnpm test:e2e               # Playwright (要 pnpm test:e2e:install)
pnpm gen:secret             # CRON_SECRET / NEXTAUTH_SECRET 生成
pnpm check:env --env=production  # env vars 検証
pnpm preflight              # 統合事前チェック
pnpm smoke                  # 本番 smoke test
pnpm db:seed-companies      # サンプル企業投入
pnpm db:seed-jobs           # サンプル求人投入
pnpm analyze                # バンドル可視化 (ANALYZE=true)
```

### 重要 endpoints
- `/api/health` — 軽量ヘルスチェック
- `/api/health?full=1` — 全項目チェック
- `/admin/status` — 管理者ダッシュボード
- `/api/admin/sentry-test` — Sentry 接続確認

---

## 設計上の重要事項

### 認証 / 権限
- **2 種類のユーザー**: `User` (求職者 / NextAuth) + `CompanyUser` (企業 / 別 model)
- `User` には Notification が紐付くが、`CompanyUser` には紐付かない
  - 企業向け通知は **dashboard バナー方式** で実装（GbizINFO リマインダー参照）
- 役割: `seeker` / `company_admin` / `company_member` / `admin`

### 求人ソース
- `direct`: 当社認定の掲載企業からの直接募集
- `hellowork`: HelloWork API 由来（参照のみ、応募は HW 経由案内）
- `EmptyJobsState` などの components は **direct のみフィルタ** されることが多い

### 課金モデル
- **成果報酬モデル**（採用 1 件あたり ¥50,000、`HIRING_FEE_AMOUNT`）
- 月額サブスクは無し
- Stripe Invoicing (`collection_method: "send_invoice"`) で請求書発行
- MoneyForward クラウド請求書も併用可（`lib/billing.ts`）

### スクレイピング対策の階層
1. `robots.txt` で AI クローラを Disallow
2. `middleware.ts` で curl 等の bot UA を 403
3. 各 API endpoint で IP 単位 rate-limit
4. `X-Robots-Tag: noarchive` で Wayback Machine 退避
5. CSP で外部スクリプトを許可リスト方式

---

## 次セッションで Claude に伝えるべきこと（テンプレ）

```
新しいセッションを始めます。SESSION_HANDOVER.md を最初に読んでください。

今日のゴール:
- [ ] SENTRY_ORG を Vercel に設定 (値: xxx)
- [ ] GSC でサイトマップ送信
- [ ] pnpm smoke で本番動作確認
- [ ] (会議結果次第) メール / Stripe の最終方針実装

それと、企業の ID/PASS を admin から発行できる仕組みを
セッション後半で実装したいです。
```

---

---

## Vercel 自動 promote 化（手動 Promote の手間をなくす）

毎回 main マージ後に「Promote to Production」をクリックしている状態を解消したい場合:

1. Vercel ダッシュボード → `let-kyujin` プロジェクトを開く
2. **Settings** → **Git** タブ
3. **Production Branch** が `main` になっていることを確認
4. **Deploy Hooks** の下にある **Ignored Build Step** を **Don't ignore**（デフォルト）に
5. **Settings** → **Domains** で `genbacareer.jp` が Production deployment にエイリアスされていることを確認
6. もし「Deployment Suspension」や「Skip Build Step」「Require Approval」が有効なら **無効化**

通常の Vercel プロジェクトはデフォルトで「main push → 自動 production deploy」になります。
現状そうなっていない理由が **Project Settings に「Require Approval for Production」のような承認制 ON が掛かっている** 可能性が高いので、その設定を OFF にする。

検証: 試しに main に空コミットを push → Vercel ダッシュボードで「Production」がそのまま走るか確認。

---

## トラブルシューティング

### ビルドが Supabase statement_timeout で失敗する
1. `chore: rebuild trigger` の空コミットを main に push (`git commit --allow-empty -m ... && git push origin main`)
2. それでも失敗するなら Supabase Dashboard → Settings → Database → statement_timeout を 120s に引き上げる
3. 根本対策は withTimeout (上記 PR で適用済) だが、データ系ページ (`/categories/[category]`, `/[prefecture]` 等) はまだ未対応

### サイトマップが GSC で「取得できませんでした」
1. `https://genbacareer.jp/sitemap.xml` をブラウザで開いて XML が出るか確認
2. 出るなら GSC 側のキャッシュ問題。一覧から削除 → 再送信
3. 出ないなら Supabase 遅延 — 数分待って再試行

### Lighthouse スコアが安定しない
- Lighthouse は `Cache-Control: no-cache` で計測するため CDN キャッシュをバイパス
- ホームの ISR 24h + warmup cron で常時ホット化済 (PR #126)
- 2-3 回測って中央値を見るのが正確

---

最終更新: 2026-05-19 午後 / 直近 PR: #128 (sitemap 修正 + canonical 集約) / 作業ブランチ: `claude/pending-content-G2KNe`
