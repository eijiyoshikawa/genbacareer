# 📋 ゲンバキャリア リリース前準備 セッションハンドオフ

最終更新: 2026-06-01
作成元セッション: リリース前準備（一連の SEO / セキュリティ / データ品質改善）

> 新しい Claude セッションを開始するときは、**このファイルの全文を最初のメッセージに貼り付けて**「これまでの経緯です。続きをお願いします」と伝えてください。

---

## プロジェクト概要

- **サイト**: ゲンバキャリア（建設業界特化型求人サイト）
- **ドメイン**: https://www.genbacareer.jp
- **リポジトリ**: github.com/eijiyoshikawa/let_kyujin
- **規模**: 求人約 11 万件（hellowork 由来 ~99% + direct 投稿）
- **技術**: Next.js 15 / TypeScript / Prisma + Supabase / NextAuth / Tailwind v4
- **ブランド**: カタカナ「ゲンバキャリア」で統一（ロゴ・タイトル・本文）
- **業界**: 建設業界特化（9 カテゴリ固定運用、他業界拡張なし）

詳細は ../CLAUDE.md を参照。

---

## ✅ 完了済み（このセッションで対応）

### 認証
- **PR #249**: LINE Login で email 権限未承認でもログイン可能に（`profile.email` フォールバック実装）
- **PR #261**: `/api/auth/reset-password` にレート制限追加（5 req/15min IP ベース）

### データ品質
- 既存スクリプト適用: 非建設業 2,205 件を status='closed' に
- **PR #250-252**: 求人異物混入監査 + 労働条件明示監査スクリプト（厳格/寛容 2 段判定）
- **PR #253-255 + バックフィル実行済**: baseSalary パーサー + 既存 8 万件の salaryMin/Max/Type 正規化
  - 78,944 件 → salaryType 内訳: monthly 67k / hourly 15.5k / daily 13k / annual 0.7k
- SQL 実行済: テスト求人 2 件 close（`ad47c88c-...`, `d516971d-...` の「未経験で施工管理になりたい方大募集！」）

### UI / UX
- **PR #256 + マイグレーション + バックフィル実行済**: `Job.displayPriority` カラム追加（5 段階優先度）
  - Tier 1: direct（2 件）
  - Tier 2: monthly + 完全（40k 件）
  - Tier 3: monthly 不完全（28k 件）
  - Tier 4: hourly/daily（30k 件）
  - Tier 5: その他（14k 件）
  - 全公開求人ページの orderBy に適用（`src/lib/job-sort.ts` 共通ヘルパー）
- **PR #257**: ヘッダー改修（マイページ/企業ダッシュボード/管理画面 + ログアウトボタン）/ 充実度% 表示 / 「フレッシュネス」→「最新性」

### インフラ / セキュリティ
- Vercel に `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` 追加 → 企業ロゴアップロード復旧
  - **重要**: `NEXT_PUBLIC_*` は Sensitive にしない（ブラウザバンドルへの埋め込み失敗するため）
- Supabase DB パスワードローテーション（チャット履歴漏洩のため緊急対応）
- DMARC レポート送信先を `kamechan7789@gmail.com`（不明な第三者）→ `eiji.yoshikawa@let-inc.net` に変更
  - Phase 1（現状）: `p=none` 維持で監視
  - Phase 2（1〜2 週間後）: `p=quarantine` に強化予定

### SEO
- **PR #258**: JobPosting JSON-LD で `salaryMax=null` のとき `minValue` 単独 → `value` 単一値で出力
- **PR #259**: Google Search Console のクローラ判定に `google-inspectiontool` UA 追加
  - これが無いと Rich Results Test / URL 検査が /login にリダイレクトされて noindex 判定されていた
  - hellowork 求人 ~10 万件すべてが Google にインデックスされていない可能性があった重大バグ
- **PR #260**: `monthsOfExperience: 0` を出力しない（schema.org 仕様準拠）
- **PR #262**: 重複求人 (`dedupedTo` IS NOT NULL) を 301 リダイレクト + 終了求人を noindex 化（Search Console の重複エラー約 18,000 件解消見込み）

---

## 🔄 進行中

### 募集情報等提供事業者の届出（職業安定法 第43条の2）

| Phase | 内容 | 状態 |
|---|---|---|
| 1 | gBizID プライム取得 | ✅ 完了 |
| 2 | 個人情報適正管理規程作成（B） | 🔄 別 Claude セッションで作成中 |
| 3 | 届出書記入（C） | 🔄 別 Claude セッションで作成中 |
| 4 | e-Gov 電子申請 | ⏳ Phase 2/3 完了後 |
| 5 | 受理通知（数週間） | ⏳ |

**ドキュメントリンク**（一時的に「リンクを知っている全員」共有中、確認後は要再制限）:
- 個人情報適正管理規程: https://docs.google.com/document/d/19DgE3jzpHtmaGBAmAN2LD1L0FgFayvBwLrw7tIu6ddo/edit
- 届出書: https://docs.google.com/spreadsheets/d/1t5TueADJphHB6aU2p2t6eJ0hb1FSNGtAOYLqR2gdiNk/edit

⚠️ Google Docs/Sheets は Claude の WebFetch で 403 になるので、レビューが必要なら **テキストコピペ** か **チェックリスト回答** 方式で進める。

参考リンク:
- 厚労省 募集情報等提供事業: https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/boshuujouhouteikyou.html
- 記載要領 PDF: https://www.mhlw.go.jp/content/001250192.pdf
- e-Gov 該当手続: https://shinsei.e-gov.go.jp/recept/procedure/lists/procedureInformation?gtaTetCd=4950008680218

---

## ⏳ 残タスク（リリース前必須・任意）

### 🔴 P0（リリース前必須）

| 項目 | 状態 | 備考 |
|---|---|---|
| 募集情報等提供事業者の届出 | 🔄 進行中 | 上記 |

### 🟡 P1（推奨）

| 項目 | 状態 | 備考 |
|---|---|---|
| Sentry alert ルール設定 | 未着手 | Slack/メール通知ルール、release tagging |
| Supabase Pro プラン化 | 未着手 | Point-in-Time Recovery（$25/月） |
| DMARC `p=none` → `p=quarantine` 移行 | 1〜2 週監視後 | `eiji.yoshikawa@let-inc.net` にレポートが届くか確認 |
| 5-6 項目全欠損 824 件の cleanup | 未着手 | リリース前に close するスクリプトを書ける |

### 🟢 P2（リリース後 OK）

| 項目 | 状態 | 備考 |
|---|---|---|
| 認証エンドポイントの分散レート制限 | 未着手 | Upstash Redis or Vercel KV へ移行 |
| Reset-password の Token 比較定数時間化 | 未着手 | `crypto.timingSafeEqual` |
| CAPTCHA 導入 | 未着手 | Cloudflare Turnstile 推奨（無料） |
| 規約改定時の同意取得フロー | 未着手 | バージョン管理 |
| E2E スモークテスト | 未着手 | 登録→応募→マイページの golden path |
| Lighthouse スコア改善 | 未着手 | モバイル 70 以上目標 |

---

## 📝 バックログ（書類完了後に着手）

| # | 内容 | 関連ファイル | 必要情報 |
|---|---|---|---|
| 1 | ロゴデータ差し替え | `src/components/layout/brand-logo.tsx` | 新ロゴファイル（PNG/SVG）+ 解像度仕様 |
| 2 | ヘッダーメニューのアイコン削除 | `src/components/layout/header.tsx` (lines 24-57) / `header-mobile-menu.tsx` | モバイルメニューもアイコン削除するか確認 |

---

## 🔑 重要なコンテキスト

### 開発環境

- **OS**: macOS (M4)
- **ターミナル**: zsh
- **DB**: Supabase pooler 経由（`.env.local` の `DATABASE_URL` は `:6543/postgres?pgbouncer=true&connection_limit=10`）
- **DB マイグレーション実行用 Session URL の作り方**:
  ```bash
  DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d= -f2- | sed 's/^"//;s/"$//')
  SESSION_URL=$(echo "$DATABASE_URL" | sed 's|:6543/|:5432/|' | sed -E 's|/postgres\?.*|/postgres|')
  psql "$SESSION_URL" -f prisma/migrations/manual/<file>.sql
  ```
- **Vercel CLI**: 質問プロンプト（plugin install / upgrade）には `n` で答える、または貼り付け前に Enter で改行を明示

### コードベース重要ファイル

| パス | 役割 |
|---|---|
| `src/lib/job-display-priority.ts` | Tier 1-5 算出ロジック |
| `src/lib/job-sort.ts` | 公開求人の orderBy 共通ヘルパー |
| `src/lib/crawler/salary-parser.ts` | 日本語賃金テキスト → salaryMin/Max/Type |
| `src/lib/guest-job-access.ts` | クローラ判定（`google-inspectiontool` 含む） |
| `src/lib/structured-data.ts` | JobPosting JSON-LD 生成 |
| `src/middleware.ts` | 認証 / レート制限 / X-Robots-Tag / canonical host |
| `src/app/jobs/[id]/page.tsx` | 求人詳細（dedup 301 / closed noindex 実装済） |

### 監査・バックフィルスクリプト

| ファイル | 状態 |
|---|---|
| `scripts/audit-jobs.ts` | カテゴリ整合性 / inferCategory 再判定 / source 別件数 |
| `scripts/audit-job-disclosures.ts` | 労働条件明示の厳格/寛容判定 + 時給/日当集計 |
| `scripts/backfill-salary-from-base-salary.ts` | ✅ 実行済（78,944 件） |
| `scripts/backfill-job-display-priority.ts` | ✅ 実行済（94,916 件 UPDATE） |
| `scripts/cleanup-non-construction-hw-jobs.ts` | ✅ 実行済（2,205 件 close） |

### 環境変数

| 変数 | 状態 |
|---|---|
| `DATABASE_URL` / `DIRECT_URL` | Supabase（パスワードローテーション済） |
| `NEXT_PUBLIC_SUPABASE_URL` | **Sensitive にしないこと** |
| `SUPABASE_SERVICE_ROLE_KEY` | Sensitive で OK |
| `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` | 設定済（scope は `profile + openid` のみ） |
| `SMTP_USER` (`genbacareer@let-inc.net`) / `SMTP_PASS` / `MAIL_FROM` | 設定済 |

### DMARC 設定（let-inc.net）

- 現状: `v=DMARC1; p=none; rua=mailto:eiji.yoshikawa@let-inc.net; ruf=mailto:eiji.yoshikawa@let-inc.net; pct=100; adkim=s; aspf=s; fo=1`
- 次のステップ: 1〜2 週間後にレポートを確認して `p=quarantine` に強化

### Search Console

- マージ後の確認: PR #259（クローラ UA）+ PR #262（重複修正）の効果が 1〜2 週間後に反映
- Rich Results Test で `/jobs/<UUID>` を投入して JobPosting 検出確認

---

## 🚀 新セッション開始時のクイックスタート

```bash
# 1. 最新化
cd ~/let_kyujin
git checkout main
git pull origin main
pnpm install
pnpm prisma generate

# 2. 動作確認
npx tsc --noEmit
npx vitest run

# 3. 監査実行（任意・現状把握用）
pnpm tsx --env-file=.env.local scripts/audit-job-disclosures.ts
```

---

## 💬 新セッションで最初に指定すること

このドキュメントを貼り付けた上で、最初に以下のどれかを指定:

| 候補 | 内容 |
|---|---|
| **書類提出を進める** | Phase 4: e-Gov 申請手順案内 / Google Docs/Sheets レビュー |
| **ロゴ + アイコン削除** | バックログの 2 件着手（新ロゴ添付必要） |
| **Sentry / Supabase Pro セットアップ** | P1 運用タスク |
| **5-6 項目全欠損 824 件 cleanup** | バックフィルスクリプト作成 |
| **その他** | このリポジトリの任意のタスク |

---

## 📌 セッションを継続する際の心得（次の Claude へ）

- このリポジトリは **本番稼働中**（求人約 11 万件、Vercel に公開済み）。データ変更は dry-run → 確認 → apply の二段階で。
- マイグレーションは `prisma/migrations/manual/*.sql` に置く文化。`prisma migrate` ではなく `psql -f` で適用する運用。
- バックフィルは `withRetry` ヘルパーで pgbouncer 接続断 (P1017) に備える。バッチサイズは 100 件推奨（500 はタイムアウトする）。
- 公開求人系の orderBy は必ず `buildPublicJobOrderBy()` を使う。直接 orderBy 配列を書かない。
- 認証エンドポイントを追加するときは `checkRateLimit` を必ず付ける。
- SEO 系メタデータ（canonical / robots）は `generateMetadata` で、リダイレクトは page 本体で `permanentRedirect` を使う。
