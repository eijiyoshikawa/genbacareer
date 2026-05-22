# 求人API統合 引き継ぎドキュメント

> ⚠️ **このドキュメントは旧設計（外部 connector 想定）です。**
> 2026-05-07 以降は **公式 HelloWork API を直接呼び出す方式**に変更されています。
> 現状の実装情報は [`HELLOWORK_API_HANDOVER.md`](./HELLOWORK_API_HANDOVER.md) を参照してください。
> このファイルは `src/lib/jobs-api/` の型契約を維持する経緯を理解するための参考資料として残しています。

> 媒体サイト `let_kyujin` ↔ ハローワーク求人 connector `hellowork-api-connector` の連携整備の進捗をまとめたもの。
> このセッションで実施した作業、未完了タスク、運用情報を一元化。

最終更新: 2026-05-03（旧設計）／ 2026-05-07 で方針変更

---

## 1. アーキテクチャ全体像

```
┌────────────────────────────┐    ┌──────────────────────────────┐
│ hellowork-api-connector    │    │ let_kyujin (このリポジトリ)  │
│ /home/user/hellowork-      │    │ submain ブランチ             │
│   api-connector            │    │                              │
│ 別 GitHub repo / 別 Vercel │    │ GitHub: eijiyoshikawa/       │
│                            │    │   let_kyujin                 │
│ ・/api/jobs/*    公開 API  │←──│ ・/api/hw-jobs/*  媒体プロキシ│
│ ・/api/meta                │    │ ・/hw-jobs        UI ページ  │
│ ・/api/cron/fetch-jobs     │    │ ・src/lib/jobs-api/ クライアント│
│                            │    │                              │
│ KV (Upstash) + Notion DB   │    │ Prisma の自社求人と分離管理   │
└────────────────────────────┘    └──────────────────────────────┘
```

連携プロトコル: HTTPS + `X-API-Key` ヘッダ。
媒体サイト側は **Route Handler でサーバプロキシ**してブラウザへ APIキーを露出させない。

---

## 2. ブランチ構成（媒体側）

| ブランチ | 用途 | 主な内容 |
|---|---|---|
| `main` | 記事専用 | 399記事 + SQL生成スクリプト |
| `system` | デザイン / インフラ系 | オレンジテーマ・リブランド・admin機能 |
| `submain` | API 連携 | `/api/hw-*` プロキシ・`/hw-jobs` UI（**現在のブランチ**）|

---

## 3. 実装済み（Phase 1〜3）

### Phase 1: データ層 + プロキシ (`4cf428e`)

`src/lib/jobs-api/`
- `types.ts` — HwJob 型一式（HelloWork connector の PublicJob と互換）
- `config.ts` — env 取得 + `JobsApiConfigError`
- `errors.ts` — `HwApiError` + `isHwApiError`
- `client.ts` — fetch ラッパー（タイムアウト + abort + 502/504 マッピング）
- `endpoints.ts` — `listHwJobs` / `getHwJob` / `getHwEmployerJobs` / `getHwMeta`
- `proxy.ts` — Route Handler 共通プロキシ（HwApiError 透過 + cache）
- `safe-fetch.ts` — Server Component 向けエラー正規化
- `format.ts` — 通貨・日付フォーマッタ
- `index.ts` — re-exports

`src/app/api/`
- `hw-jobs/route.ts` — 一覧プロキシ（zod 検証）
- `hw-jobs/[kjno]/route.ts` — 詳細プロキシ
- `hw-jobs/meta/route.ts` — メタ情報プロキシ
- `hw-employers/[hojinno]/jobs/route.ts` — 事業所別プロキシ

`.env.example` に `JOBS_API_BASE_URL` / `JOBS_API_KEY` / `JOBS_API_TIMEOUT_MS` 追加。

### Phase 2: UI ページ (`7d7512b`)

`src/components/hw-jobs/`
- `hw-job-card.tsx` — 求人カード
- `hw-search-form.tsx` — 検索フォーム
- `hw-pagination.tsx` — ページネーション
- `hw-last-synced.tsx` — 最終同期日時表示
- `hw-empty-state.tsx` — 0件時 UI
- `hw-api-unavailable.tsx` — connector 未設定 / エラー時 UI
- `hw-job-structured-data.tsx` — schema.org JobPosting JSON-LD

`src/app/`
- `hw-jobs/page.tsx` — 一覧ページ
- `hw-jobs/[kjno]/page.tsx` — 詳細ページ + JSON-LD
- `hw-jobs/[kjno]/not-found.tsx` — 「終了求人」UX
- `hw-employers/[hojinno]/page.tsx` — 事業所ページ
- `hw-employers/[hojinno]/not-found.tsx`

`src/app/sitemap.ts` に `/hw-jobs` 追加。
`src/components/layout/header.tsx` `footer.tsx` に hw-jobs ナビ追加。

### Phase 3: トップページ + /jobs 強化 (`a9d4531`)

`src/components/hw-jobs/`
- `hw-jobs-latest.tsx` — トップページ向け新着 6 件カード
- `hw-meta-summary.tsx` — トップページ向け件数バッジ + 都道府県 Top 8

`src/app/page.tsx` — HW セクション 2 つを LogoSlider 直下に挿入。
`src/app/jobs/page.tsx` — Prisma 検索強化:
- 月給範囲（min/max）を 万円→円 で正しく変換（既存バグ修正）
- 掲載期間フィルタ（3/7/14/30 日以内）
- 並び順切替（新着 / 給与高 / 給与低 / 閲覧多）
- アクティブフィルタチップ
- pagination が新パラメータ全保持
- /hw-jobs への相互リンク

`src/app/hw-jobs/page.tsx` — /jobs への逆リンク追加。

---

## 4. connector 側 (`/home/user/hellowork-api-connector`)

別ディレクトリに独立リポジトリとして配置。git 初期コミット済み（**未 push**）。

### 完成済みレイヤー

- 公開 API（`/api/jobs/*`, `/api/meta`, `/api/health`）
- KV ラッパー（インメモリ + Upstash 互換）
- JobStore（`replaceAll` で全件置換 + 索引）
- Notion 同期（`NotionJobSync`）
- 認証（`MEDIA_API_KEYS` カンマ区切り + `timingSafeEqual`）
- CORS（`MEDIA_ALLOWED_ORIGINS` allowlist）
- 共通エラー / キャッシュヘッダ
- 構造化ログ + Slack 通知
- 和暦変換（`parseWareki` `parseSlashDate`）
- 都道府県解決（`resolvePrefecture`）
- cron ハンドラ（タイムアウト保護 + KV書き込みフェーズ）
- 統合テスト 22 シナリオ全パス

### TODO スタブ（未実装）

`lib/hellowork/parser.js` `lib/hellowork/client.js` のみ。
**HelloWork API 仕様書入手後**に実装。詳細は connector 側 `docs/HELLOWORK_TODO.md`。

### ディレクトリ

```
hellowork-api-connector/
├ api/
│  ├ jobs/{index.js, [kjno].js}
│  ├ employers/[hojinno]/jobs.js
│  ├ cron/fetch-jobs.js
│  ├ meta.js
│  └ health.js
├ lib/
│  ├ store/{kv.js, job-store.js}
│  ├ shape/{public-job.js, wareki.js}
│  ├ auth/api-key.js
│  ├ http/response.js
│  ├ notion/{sync.js, prefecture.js}
│  ├ hellowork/{parser.js, client.js}  ← TODO スタブ
│  ├ logger.js
│  └ slack.js
├ scripts/{test-public-api.js, init-notion-db.js,
│          smoke-test.js, run-cron-locally.js}
├ samples/M100-sample.xml
├ docs/{API_HANDOVER.md, DESIGN.md, HELLOWORK_TODO.md}
├ vercel.json (cron schedule)
├ package.json / .env.example / .gitignore / README.md
```

---

## 5. デプロイ・運用ステップ進捗

### ステップ 1: API キー生成 ✅

```bash
openssl rand -hex 32  # ×3
```

dev / staging / prod 用に 3 本生成。各々 64 文字。

### ステップ 2: connector 側 `MEDIA_API_KEYS` / `MEDIA_ALLOWED_ORIGINS` 設定 ✅

connector の Vercel に設定済み。

### ステップ 3 (= ステップ B): connector を Vercel デプロイ ✅

`hellowork-api-connector` を Vercel project として import 済み。

### ステップ C: connector 側 環境変数設定 ✅

| Key | 状態 |
|---|---|
| `MEDIA_API_KEYS` | 設定済み |
| `MEDIA_ALLOWED_ORIGINS` | 設定済み |
| `KV_REST_API_*` | Upstash Redis 接続で自動注入済み |
| `CRON_SECRET` | （未設定 or 空欄）|
| `NOTION_API_KEY` | （未設定 or 空欄）|
| `NOTION_JOBS_DB_ID` | （未設定 or 空欄）|
| `HELLOWORK_API_ID` | **空欄**（申請承認済みだが ID/Pass が見つからず）|
| `HELLOWORK_API_PASS` | **空欄**（同上）|
| `HELLOWORK_API_BASE` | 空欄（コード側でデフォルト URL）|
| `SLACK_WEBHOOK_URL` | 空欄（任意）|

公開 API は動作可能な状態。cron は HelloWork 認証情報が無いため 500 で停止する設計（安全側）。

### ステップ A: connector を GitHub に push ⏸（保留）

私の MCP は `let_kyujin` のみアクセス可。connector の repo は手動作成 + push 必要。

```bash
# 手順（未実施）
cd /home/user/hellowork-api-connector
# 1. GitHub で hellowork-api-connector を Private で新規作成
git remote add origin https://github.com/eijiyoshikawa/hellowork-api-connector.git
git push -u origin main
```

### ステップ D: 媒体側 Vercel に `JOBS_API_*` 設定 ✅

- `JOBS_API_BASE_URL` / `JOBS_API_KEY` を Vercel ダッシュボードに登録
- Production Branch を `claude/update-website-design-Cu8LX` → **`submain`** に変更
  - 以降は submain への push が自動で `genbacareer.jp` に反映される
- 設定反映 Redeploy 実行

### ステップ E: デザインリブランド ✅

参考デザイン（助太刀社員）を元に Phase 4〜6 を実施:
- 3軸トリコロール（brand-yellow / primary-orange / ink-black）に統合
- ヒーロー: 黒斜めオーバーレイ + 大ロゴ + 更新バッジ + CTA 2 本
- 黄色求人検索ボックス + 黒ヘッダーかんたん検索 + ピル型ボタン
- 特集 / 百名社風バナー / 今週の新着求人 / テーマグリッド / 信頼セクション
- 黒帯フッター（アプリ案内 + 求人掲載 CTA）
- 角丸全面削除 + Noto Sans JP (Black 900) 字体導入

---

## 6. HelloWork API 申請状況

- ✅ **申請承認済み**
- ❌ **API ID / Pass が見つからない**（探索中）

確認すべき場所:
1. 承認メール本文 / 添付 PDF
2. 別便メール（「ID 通知書」「Pass 通知書」）
3. 郵送物（書留 / 簡易書留）
4. 申請ポータルへのログイン
5. ヘルプデスクへ問い合わせ

ID/Pass 入手後の作業:
1. connector の Vercel 環境変数に `HELLOWORK_API_ID` / `HELLOWORK_API_PASS` 設定
2. 仕様書を読んで `lib/hellowork/parser.js` `lib/hellowork/client.js` を実装
3. `samples/M100-sample.xml` を実 API レスポンス例に置換
4. ローカル `node scripts/run-cron-locally.js --dryRun --maxPages=2` で検証
5. Vercel cron が日次で `/api/cron/fetch-jobs` を発火

---

## 7. 媒体側 (`let_kyujin`) のグレースフル動作

connector 未設定 / 空でも媒体側は壊れません。

| URL | connector あり | connector なし |
|---|---|---|
| `/hw-jobs` | 求人一覧表示 | 「ハローワーク求人サービスは現在準備中です」UI |
| `/hw-jobs/[kjno]` | 詳細表示 | 同上 |
| `/hw-employers/[hojinno]` | 事業所表示 | 同上 |
| `/`（トップ）| HW 件数バッジ + 新着カード表示 | HW セクション全体非表示（壊れず）|

`safeFetch` ヘルパが `JobsApiConfigError` をキャッチして自動でグレースフル状態に切替。

---

## 8. 残タスク

### このセッションで進められるもの

- ⏭ **ステップ D**: 媒体側 Vercel に `JOBS_API_BASE_URL` / `JOBS_API_KEY` 設定
- ⏭ 媒体側で連携疎通確認（ステップ D 完了後）

### HelloWork ID/Pass 入手後

- ⏸ HelloWork XML パーサ実装（`lib/hellowork/parser.js`）
- ⏸ HelloWork HTTP クライアント実装（`lib/hellowork/client.js`）
- ⏸ Notion DB 作成 + Integration 接続
- ⏸ cron 動作確認

### 完全な手動作業

- ⏸ connector を GitHub に push（手動 repo 作成必要）
- ⏸ HelloWork ID/Pass の探索（メール / 郵送 / 問い合わせ）
- ⏸ Vercel Cron 設定（vercel.json で予約済み、ダッシュボードで確認）

---

## 9. 関連ファイル参照

| 用途 | パス |
|---|---|
| 媒体側 API クライアント | `let_kyujin/src/lib/jobs-api/` |
| 媒体側 プロキシ Route Handler | `let_kyujin/src/app/api/hw-{jobs,employers}/` |
| 媒体側 UI ページ | `let_kyujin/src/app/hw-{jobs,employers}/` |
| 媒体側 共通コンポーネント | `let_kyujin/src/components/hw-jobs/` |
| connector 公開 API | `hellowork-api-connector/api/` |
| connector ストア層 | `hellowork-api-connector/lib/store/` |
| connector HelloWork (TODO) | `hellowork-api-connector/lib/hellowork/` |
| connector 仕様 | `hellowork-api-connector/docs/API_HANDOVER.md` |
| 設計メモ | `hellowork-api-connector/docs/DESIGN.md` |
| HelloWork 実装ガイド | `hellowork-api-connector/docs/HELLOWORK_TODO.md` |

---

## 10. コミット履歴（submain ブランチ）

```
a9d4531 feat: HW jobs on top page + enhanced /jobs Prisma search
7d7512b feat(hw-jobs): add UI pages for HelloWork connector jobs
4cf428e feat(jobs-api): add HelloWork connector client and proxy routes
ed8aec4 feat: add SQL generator for 199 article placeholder bulk import
37be516 Merge pull request #2 (記事拡張・画像追加)
```

connector ローカル:
```
24d638a feat: initial connector scaffold with public API + KV/Notion store
```
