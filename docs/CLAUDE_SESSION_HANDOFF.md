# 📋 ゲンバキャリア リリース前準備 セッションハンドオフ

最終更新: 2026-06-09
作成元セッション: データ品質 / セキュリティ(RLS) / inferCategory精度 / 記事自動リライト基盤 / マガジン画像挿入 / リセットトークン保護

> 新しい Claude セッションを開始するときは、**このファイルの全文を最初のメッセージに貼り付けて**「これまでの経緯です。続きをお願いします」と伝えてください。

---

## プロジェクト概要

- **サイト**: ゲンバキャリア（建設業界特化型求人サイト）
- **ドメイン**: https://www.genbacareer.jp
- **リポジトリ**: github.com/eijiyoshikawa/let_kyujin
- **規模**: 公開求人 約 7.8 万件（hellowork 由来 + direct。※非建設業 cleanup で active が約9.2万→7.8万に純化）
- **技術**: Next.js 16 / TypeScript / Prisma + Supabase / NextAuth / Tailwind v4
- **ブランド**: カタカナ「ゲンバキャリア」で統一（ロゴ・タイトル・本文）
- **業界**: 建設業界特化（9 カテゴリ固定運用、他業界拡張なし）
- **Supabase**: PRO プラン / プロジェクト ref `wjimvcyzunfgaqzthdbd`
- **Vercel**: team `eijiyoshikawas-projects` / project `let-kyujin` / region `hnd1`

詳細は ../CLAUDE.md を参照。

---

## ✅ 直近セッションの完了分（2026-06-09）★最重要

すべて PR #264〜#271 でマージ＆本番デプロイ済み（main 最新 `7b4843c` が READY、`www.genbacareer.jp` 反映済み）。

### データ品質
- **労働条件明示の欠損求人 264 件を close**（`status='closed'`）
  - 寛容判定で欠損 5 項目以上が対象。`src/lib/job-disclosure.ts`（監査と cleanup が共有）+ `scripts/cleanup-incomplete-disclosure-jobs.ts`（dry-run/apply, 版退避なし, 100件バッチ）
  - ※ 旧handoffの「824件」は賃金バックフィル後に実数 264 件まで減少
- **非建設業 13,355 件を close**（歯科/IT/製造オペレーター等）
  - `scripts/cleanup-non-construction-hw-jobs.ts` に**安全トリップワイヤー**追加: 「非建設業判定なのにタイトルに強い建設KWを含む」求人を炙り出し、0件でなければ `--apply` を中止（`--force` で上書き）。apply は `updateMany` バッチ
  - 再実行で 0 件 = 冪等確認済み

### inferCategory 精度改善（`src/lib/crawler/import-batch.ts`）
- 偽陽性是正: `衛生`→`衛生設備|給排水`、`オペレーター`単独除去→`建設機械|建機|ショベル|ユンボ`追加、全角正規化 `normalizeWidth()`（ＳＥＳ/Ｒｅａｃｔ/ＣＡＤ）、歯科/口腔・IT複合語をブロックリスト追加
- **偽ブロックを2回検出して是正**（dry-runが防いだ）:
  - `機械オペレータ`が「建設**機械オペレータ**」を誤ブロック → 削除＋driverに`建設機械`追加
  - `客先常駐`/`システム設計`/`インフラエンジニア`/`ネットワークエンジニア`が土木インフラ等を巻き込む → 削除
- 「IT複合語はブロックに入れても、建設KWが無い純IT求人は元々nullになる。建設KWと同居する求人だけを反転させるので、両義語(インフラ/ネットワーク/システム設計)は土木を巻き込み有害」という教訓。リグレッションテスト多数追加

### セキュリティ
- **public 全テーブルに RLS 有効化**（Supabase Security Advisor の Critical 2件 `rls_disabled_in_public` / `sensitive_columns_exposed` を解消・確認済み）
  - `prisma/migrations/manual/enable_rls_all_public_tables.sql`（動的列挙・冪等・`FORCE`なし）。本番適用済み
  - **無影響の根拠**: テーブルデータは100% Prisma（postgres=所有者→RLSバイパス）経由。Supabase JS はストレージ専用(service_role)。anon キーでのテーブルアクセスはコード上ゼロ
  - Advisor の残り: Warning 1（`pg_trgm` in public, 検索インデックス壊すため**触らない**）/ Info 38（`RLS Enabled No Policy` = 意図どおりの状態, 対応不要）
- **パスワードリセットトークンをハッシュ化保存**（`src/lib/tokens.ts` `hashToken()` SHA-256）。forgot-password で hash 保存、reset-password で hash 照合。DB漏洩時に有効トークンが流出しない

### UI
- **ヘッダーのアイコン全削除**（PC/モバイルのナビ+CTA。ハンバーガー≡/×は維持）`header.tsx` / `header-mobile-menu.tsx`

### マガジン記事（799 記事）
- **記事SEO自動リライト基盤**（`src/lib/article-rewrite.ts` + `/api/cron/article-rewrite`）
  - GSC(`SearchConsoleSnapshot`)から「表示多×CTR/順位低（5〜20位の伸びしろ）」を選定→Claude(sonnet)でリライト→検証→版退避→自動公開。**3日に1回 cron**（`0 6 */3 * *`）
  - 安全機構: キルスイッチ `ARTICLE_REWRITE_ENABLED`(本番=true 設定済) / dry-run / slug固定 / クールダウン30日 / `maxPosition=40`(圏外除外) / AI出力検証 / `ArticleRevision`退避
  - **現状**: GSCデータが薄く候補0件で健全に空回り。1〜2週間でデータが溜まれば候補が出る
- **全公開記事(799件)にヒーロー画像差替＋本文2枚挿入**
  - Drive→ローカルDL→Web縮小(長辺1600px,計121MB)→Supabase Storage `company-media/articles/`(366枚) アップ→全記事に**シャッフル割当**(seed可変)
  - `src/lib/article-images.ts`(純関数) + `scripts/upload-article-images.ts` + `scripts/insert-article-images.ts`(`--apply`/`--reassign`/`--seed=N`/`--no-hero`)
  - 冪等(マーカー`data-auto-img`) / `ArticleRevision`(source=image-insert/image-reassign)退避でロールバック可

### スキーマ追加（本番適用済み）
- `Article`: `lastRewrittenAt` / `rewriteCount` カラム
- `ArticleRevision` テーブル（記事の版履歴・ロールバック用）
- 手動SQL: `prisma/migrations/manual/article_rewrite.sql` + `ensure-schema.ts` に反映

---

## ✅ それ以前の完了分（〜2026-06-01 セッション・要約）

- 認証: PR #249（LINE email フォールバック）, #261（reset-password レート制限）
- データ品質: 非建設業 2,205件close（当時）, 賃金正規化バックフィル 78,944件, `Job.displayPriority`(Tier1-5)
- UI: PR #257 ヘッダー改修 / 充実度% 表示
- インフラ: Vercel に Supabase 環境変数追加（ロゴ復旧）, DBパスワードローテーション, DMARC送信先変更
- SEO: PR #258(salary value), #259(google-inspectiontool UA), #260(monthsOfExperience:0除外), #262(重複301+終了noindex)

---

## 🔄 進行中

### 募集情報等提供事業者の届出（職業安定法 第43条の2）★P0

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | gBizID プライム取得 | ✅ 完了 |
| 2 | 個人情報適正管理規程作成 | 🔄 別 Claude セッションで作成中 |
| 3 | 届出書記入 | 🔄 別 Claude セッションで作成中 |
| 4 | e-Gov 電子申請 | ⏳ Phase 2/3 完了後 |
| 5 | 受理通知（数週間） | ⏳ |

**ドキュメントリンク**:
- 個人情報適正管理規程: https://docs.google.com/document/d/19DgE3jzpHtmaGBAmAN2LD1L0FgFayvBwLrw7tIu6ddo/edit
- 届出書: https://docs.google.com/spreadsheets/d/1t5TueADJphHB6aU2p2t6eJ0hb1FSNGtAOYLqR2gdiNk/edit

⚠️ Google Docs/Sheets は Claude の WebFetch で 403。レビューは **テキストコピペ** か **チェックリスト回答** 方式で。

参考: [厚労省](https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/boshuujouhouteikyou.html) / [記載要領PDF](https://www.mhlw.go.jp/content/001250192.pdf) / [e-Gov手続](https://shinsei.e-gov.go.jp/recept/procedure/lists/procedureInformation?gtaTetCd=4950008680218)

---

## ⏳ 残タスク

### 🔴 P0（リリース前必須）
| 項目 | 状態 | 備考 |
|---|---|---|
| 募集情報等提供事業者の届出 | 🔄 進行中 | 上記。最大の関門 |

### 🟡 P1（推奨）
| 項目 | 状態 | 備考 |
|---|---|---|
| DMARC `p=none`→`p=quarantine` 移行 | 監視済・**移行可** | レポート先は自社に変更済。そろそろ強化タイミング |
| Sentry alert ルール設定 | 未着手 | Slack/メール通知, release tagging |
| Supabase PITR 確認 | ほぼ完了 | PRO化済み。Point-in-Time Recovery 有効化の最終確認のみ |
| 記事自動リライトの初稼働確認 | ⏳ 待ち | GSCデータ蓄積後(1〜2週)に候補が出るか再確認 |

### 🟢 P2（リリース後 OK）
| 項目 | 状態 | 備考 |
|---|---|---|
| ~~Reset-password Token保護~~ | ✅ 完了 | hashToken でハッシュ化保存済（2026-06-09） |
| 認証エンドポイントの分散レート制限 | 未着手 | Upstash Redis / Vercel KV（外部サービス契約が必要） |
| CAPTCHA 導入 | 未着手 | Cloudflare Turnstile（要アカウント/サイトキー） |
| 規約改定時の同意取得フロー | 未着手 | バージョン管理（要プロダクト仕様判断） |
| E2E スモークテスト | 未着手 | 登録→応募→マイページ |
| Lighthouse スコア改善 | 未着手 | モバイル70+。記事画像を軽量化済(追い風) |

### 📝 バックログ
| 項目 | 関連ファイル | 必要情報 |
|---|---|---|
| ロゴデータ差し替え | `src/components/layout/brand-logo.tsx` | 新ロゴ（PNG/SVG）+解像度仕様 |

### 🧹 デッドコード候補（今回精査・未対応）
- `src/lib/moneyforward.ts`（`createMfPartner`/`createMfBilling`）= 未使用のMF APIクライアント。現状は admin の手動請求フロー(`/admin/billing-todo`)に移行済み。**将来API自動化の土台として残す判断済み**
- `src/lib/jobposting-validator.ts` = テストからのみ参照。現状維持
- `AiGeneratedArticle` モデル = 休眠テーブル（公開ルート無し）。現状維持

---

## 🔑 重要なコンテキスト

### 開発環境
- **OS**: macOS (M4) / **ターミナル**: zsh（コマンド貼付時 `#` コメント行は `command not found` になるが無害）
- **DB**: Supabase pooler 経由（`.env.local` の `DATABASE_URL` は `:6543/...?pgbouncer=true&connection_limit=10`）
- **DB マイグレーション用 Session URL**:
  ```bash
  DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//;s/"$//')
  SESSION_URL=$(echo "$DATABASE_URL" | sed 's|:6543/|:5432/|' | sed -E 's|/postgres\?.*|/postgres|')
  psql "$SESSION_URL" -f prisma/migrations/manual/<file>.sql
  ```
- **Vercel CLI**: plugin install プロンプトには `n`。`vercel env pull .env.vercel.local --environment=production` で本番env取得可（ただし **Sensitive変数(CRON_SECRET等)は pull で取れない**）
- **画像縮小**: macOS `sips -Z 1600 *.JPG`。文字化けzipは `ditto -x -k` か `tar -xf` で展開（`unzip`はIllegal byte sequenceで失敗）

### コードベース重要ファイル（今回分を追記）
| パス | 役割 |
|---|---|
| `src/lib/job-disclosure.ts` | 労働条件明示の欠損判定（監査/cleanup共有, findMissingLenient） |
| `src/lib/crawler/import-batch.ts` | `inferCategory`（カテゴリ判定・ブロックリスト・normalizeWidth） |
| `src/lib/article-rewrite.ts` | 記事SEO自動リライト中核（選定/スコア/検証/プロンプト純関数） |
| `src/lib/article-images.ts` | 記事画像のローテーション割当/挿入/シャッフル/strip（純関数） |
| `src/lib/tokens.ts` | リセットトークン生成 + `hashToken()` |
| `src/lib/job-display-priority.ts` / `job-sort.ts` | Tier算出 / 公開orderBy共通(`buildPublicJobOrderBy()`) |
| `src/lib/gsc.ts` | Search Console API（OAuth/SA, querySearchAnalytics） |
| `src/lib/ga4.ts` | ※クライアント側 gtag のみ（**GA4 Data API ではない**） |
| `src/lib/structured-data.ts` / `guest-job-access.ts` / `middleware.ts` | JSON-LD / クローラ判定 / 認証・レート制限 |
| `src/app/jobs/[id]/page.tsx` / `src/app/journal/[slug]/page.tsx` | 求人詳細 / マガジン記事 |
| `src/lib/ensure-schema.ts` | 起動時の冪等 ALTER/CREATE（新規テーブルはここにも追記する） |

### スクリプト
| ファイル | 用途 / 状態 |
|---|---|
| `scripts/audit-jobs.ts` | カテゴリ整合性 / inferCategory 再判定 |
| `scripts/audit-job-disclosures.ts` | 労働条件明示の厳格/寛容判定 + 時給/日当集計 |
| `scripts/cleanup-incomplete-disclosure-jobs.ts` | ✅ 264件close済(dry-run/`--apply`/`--min-missing`) |
| `scripts/cleanup-non-construction-hw-jobs.ts` | ✅ 13,355件close済(安全トリップワイヤー/`--apply`/`--force`) |
| `scripts/upload-article-images.ts` | 画像→`company-media/articles/`アップ(`--dir`/`--apply`, バケット自動作成) |
| `scripts/insert-article-images.ts` | 記事へ画像挿入(`--apply`/`--reassign`/`--seed=N`/`--no-hero`) |
| `scripts/backfill-salary-from-base-salary.ts` / `backfill-job-display-priority.ts` | ✅ 実行済 |

### 環境変数
| 変数 | 状態 |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase（パスワードローテーション済） |
| `NEXT_PUBLIC_SUPABASE_URL` | **Sensitive にしないこと**。ローカル`.env.local`にも追記済 |
| `SUPABASE_SERVICE_ROLE_KEY` | Sensitive で OK。ストレージ/画像で使用 |
| `ANTHROPIC_API_KEY` | 記事リライト/AI機能。本番設定要確認 |
| `ARTICLE_REWRITE_ENABLED` | **本番=`true` 設定済**（自動公開ON） |
| `CRON_SECRET` | **本番でSensitive設定** → `vercel env pull`で取れない。手動cron叩く時はDashboardでReveal/再設定 |
| `GSC_*`（OAuth or SA + `GSC_SITE_URL`） | Search Console 同期 |
| `LINE_CLIENT_ID/SECRET`（scope=profile+openid） / `SMTP_*` | 設定済 |

### DMARC（let-inc.net）
- 現状 `v=DMARC1; p=none; rua/ruf=mailto:eiji.yoshikawa@let-inc.net; pct=100; adkim=s; aspf=s; fo=1`
- 次: レポート確認後 `p=quarantine` に強化（移行可フェーズ）

### Vercel cron 一覧（`vercel.json`）
warmup(5分) / expire-jobs / expire-scouts / plan-expiry-notice / expire-plans / rotate-companies / billing-todo-digest / hellowork-import(毎時) / saved-search-alerts / refresh-gbiz(月次) / search-console-sync(日次) / **article-rewrite(3日毎)**

---

## 🚀 新セッション開始時のクイックスタート

```bash
# 1. 最新化
cd ~/let_kyujin
git checkout main && git pull origin main
pnpm install
pnpm prisma generate

# 2. 動作確認（全グリーンのはず: tsc / vitest 491件）
npx tsc --noEmit
npx vitest run

# 3. 状況把握（任意）
pnpm tsx --env-file=.env.local scripts/audit-jobs.ts
```

---

## 💬 新セッションで最初に指定する候補

| 候補 | 内容 |
|---|---|
| **書類提出を進める** | 募集情報等提供事業者の届出 Phase 4: e-Gov申請 / 規程・届出書レビュー（テキストコピペ方式） |
| **DMARC強化** | `p=quarantine` への移行（DNS編集） |
| **記事自動リライト監視** | GSCデータ蓄積後の候補確認・初稼働チェック |
| **別ブランチの取り込み** | `claude/stoic-johnson-xlUso`（SQLパラメータ/UUID検証等のバグ修正, 未マージ）のレビュー＆マージ検討 |
| **P2セキュリティ** | 分散レート制限 / CAPTCHA など（外部サービス要） |
| **その他** | このリポジトリの任意タスク |

---

## 📌 セッション継続の心得（次の Claude へ）

- このリポジトリは **本番稼働中**（Vercel公開・実ユーザー/実求人）。データ変更は必ず **dry-run → 確認 → apply** の二段階。
- 大量データ操作は**安全トリップワイヤー**（建設KW検知で誤close防止 等）を仕込み、`--apply`を条件付きにする文化。
- マイグレーションは `prisma/migrations/manual/*.sql` を `psql -f` で適用（`prisma migrate` ではない）。新規テーブルは `ensure-schema.ts` にも冪等追記。**新規テーブルは RLS 有効化も忘れない**（public全テーブルRLS方針）。
- バックフィル/一括更新は `withRetry`(P1017/P2028/P1001) + 100件バッチ。
- 公開求人の orderBy は `buildPublicJobOrderBy()`。認証エンドポイントは `checkRateLimit` 必須。
- SEOメタ(canonical/robots)は `generateMetadata`、リダイレクトは page で `permanentRedirect`。
- `inferCategory` のブロックリストに語を足すときは、**建設語と同居して誤ブロックしないか**を `scripts/cleanup-non-construction-hw-jobs.ts` の dry-run（安全チェック0件）で必ず検証してから apply。
- 作業は feature ブランチ → PR → マージ。各PRで `tsc`/`vitest`/`eslint` を通す。
- Claude が直接アクセスできないもの: Google Drive/Docs/Sheets(403), Vercel Sensitive env, 本番DB（ローカルから psql/tsx 実行は user 側）。

