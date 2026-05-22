# HelloWork 求人 API 連携 引き継ぎドキュメント

> 厚生労働省「ハローワーク求人・求職情報提供サービス」の **公式 API** を let_kyujin に直接連携する実装。
> 旧 `docs/JOBS_API_INTEGRATION.md` の外部 connector 想定設計から方針変更し、本番運用中。

最終更新: 2026-05-07（P1 ローテーション戦略実装）

---

## 1. 現状サマリ

| 項目 | 状態 |
|---|---|
| 実装ブランチ | `main`（submain から merge 済み・本番反映） |
| HelloWork API 連携 | ✅ 公式 API (`https://teikyo.hellowork.mhlw.go.jp/teikyo/api/2.0/`) を直接呼ぶ |
| 本番 DB（Supabase） | ✅ 1000 件投入済み（`source = 'hellowork'`、全件 `status = 'active'`） |
| Vercel デプロイ | ✅ `genbacareer.jp` で稼働中 |
| Vercel Cron | ✅ 毎日 04:00 UTC（13:00 JST）に `/api/cron/hellowork-import` 自動実行 |
| サイト表示 | ✅ `/jobs`（混在）+ `/hw-jobs`（HW 専用）で 1000 件表示 |

---

## 2. アーキテクチャ

```
┌─────────────────────────────────────────┐
│ 厚労省 HelloWork 求人情報提供 API        │
│ https://teikyo.hellowork.mhlw.go.jp/    │
│   teikyo/api/2.0/                       │
│ POST /auth/getToken    トークン発行     │
│ POST /auth/delToken    トークン破棄     │
│ POST /kyujin           データID リスト  │
│ POST /kyujin/{id}/{p}  求人データ XML   │
└─────────────────────────────────────────┘
              ↑ 認証: id (メアド) / pass
              ↑ レスポンス: XML
┌─────────────────────────────────────────┐
│ let_kyujin (Next.js 16 / Vercel)        │
│                                         │
│ src/lib/crawler/hellowork.ts            │
│   getToken / delToken                   │
│   fetchKyujinIdList                     │
│   fetchKyujinByDataId                   │
│   fetchAllJobs                          │
│                                         │
│ src/lib/crawler/import-batch.ts         │
│   importHelloworkJobs (Prisma upsert)   │
│                                         │
│ src/app/api/cron/hellowork-import/      │
│   POST /api/cron/hellowork-import       │
│   ↑ Vercel Cron（毎日 04:00 UTC）       │
│                                         │
│ src/lib/jobs-api/endpoints.ts           │
│   listHwJobs / getHwJob / getHwMeta     │
│   → Prisma DB から取得（外部 API 不要） │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ Supabase PostgreSQL                     │
│ jobs テーブル                           │
│   source = 'hellowork' で識別           │
│   helloworkId が unique key             │
└─────────────────────────────────────────┘
```

---

## 3. 環境変数

### 本番（Vercel Settings → Environment Variables）

| Key | 用途 | 機微度 |
|---|---|---|
| `HELLOWORK_API_USER` | API 認証 ID（メールアドレス形式） | Sensitive |
| `HELLOWORK_API_PASS` | API 認証パスワード | Sensitive |
| `HELLOWORK_API_BASE` | API ベース URL（省略可、デフォルト `https://teikyo.hellowork.mhlw.go.jp/teikyo/api/2.0`） | - |
| `CRON_SECRET` | Cron エンドポイント Bearer 認証 | Sensitive |
| `DATABASE_URL` | Supabase Postgres 接続文字列 | Sensitive |
| `ADMIN_API_KEY` | `/api/admin/hellowork/import` 用（手動投入時のみ） | Sensitive |

`Sensitive` マーク付きは **保存後に値を再表示できない**。値を変える場合は Delete & Add で上書き＋ Redeploy が必要。

### ローカル（`.env.local`）

```
HELLOWORK_API_USER=<メールアドレス>
HELLOWORK_API_PASS=<パスワード>
ADMIN_API_KEY=<長い文字列>
DATABASE_URL=<Supabase 接続文字列>  ← .env から自動読み込み or 同じ値を入れる
```

`chmod 600 .env.local` 推奨。

---

## 4. 主要ファイル

| パス | 役割 |
|---|---|
| `src/lib/crawler/hellowork.ts` | HelloWork API クライアント（getToken / fetchKyujin* / fetchAllJobs / fetchPagesFromDataId / fetchDataIds） |
| `src/lib/crawler/import-batch.ts` | Prisma への upsert 処理 |
| `src/lib/crawler/rotation-planner.ts` | 全国 36 万件取り込み用ローテーション計画（planNextRotation / recordBatchResult / syncDataIds） |
| `src/app/api/cron/hellowork-import/route.ts` | Cron エンドポイント（CRON_SECRET 認証、ローテーション対応） |
| `src/app/api/admin/hellowork/import/route.ts` | 管理者向け手動投入（ADMIN_API_KEY 認証） |
| `src/app/api/admin/hellowork/progress/route.ts` | 進捗確認・sync・reset（ADMIN_API_KEY 認証） |
| `src/lib/jobs-api/endpoints.ts` | `/hw-jobs` ページ用の DB 取得層（旧 connector 互換 API） |
| `src/app/hw-jobs/page.tsx` | HelloWork 求人専用ページ |
| `src/app/jobs/**` | 全求人検索（自社掲載 + HW を混在表示） |
| `vercel.json` | Cron スケジュール定義 |
| `scripts/README.md` | スクリプト一覧と使い方 |

---

## 5. 運用コマンド集

### 疎通確認

```bash
pnpm tsx --env-file=.env.local scripts/test-hellowork-api.ts
```

### データ品質サマリ（dry-run、DB 書き込みなし）

```bash
pnpm tsx --env-file=.env.local scripts/dryrun-hellowork-import.ts
```

### XML 生レスポンス確認（タグ構造を見たい時）

```bash
pnpm tsx --env-file=.env.local scripts/dump-hellowork-raw.ts
pnpm tsx --env-file=.env.local scripts/dump-hellowork-tags.ts   # タグ統計
```

### 本番取り込み（実 DB 書き込み、デフォルト 1000 件）

```bash
pnpm tsx --env-file=.env.local scripts/run-hellowork-import.ts
HW_IMPORT_MAX_JOBS=10 pnpm tsx --env-file=.env.local scripts/run-hellowork-import.ts
```

### Cron 手動起動（本番）

```bash
read -s CRON_SECRET
# (Vercel に登録した値を貼る)

curl -L -X POST "https://genbacareer.jp/api/cron/hellowork-import?maxJobs=10" \
  -H "Authorization: Bearer $CRON_SECRET" \
  -w "\nHTTP %{http_code} (%{time_total}s)\n"

unset CRON_SECRET
```

### ロールバック

```sql
-- HW 求人を全削除
DELETE FROM jobs WHERE source = 'hellowork';

-- 全件再 active 化
UPDATE jobs SET status = 'active' WHERE source = 'hellowork';
```

---

## 6. これまでの作業履歴（2026-05-03 〜 2026-05-07）

### 6.1 ブランチ整理（2026-05-04）
- `system` を `main` に取り込み（デザイン刷新＋ゲンバキャリアへのリブランド＋管理画面 CRUD）
- 建設サブカテゴリ・タグ taxonomy を `prisma/schema.prisma` と `src/lib/article-constants.ts` に追加
- 不要ブランチ整理（権限の都合で push --delete は失敗、Web UI で別途削除予定）

### 6.2 HelloWork API 連携（2026-05-07）

| 段階 | 内容 |
|---|---|
| 1. 既存実装レビュー | submain の `hellowork.ts` は HTML スクレイピングだったが、公式 API は別仕様と判明 |
| 2. 公式 API へ完全移行 | `fast-xml-parser` 導入、getToken/delToken/fetchKyujin* を実装 |
| 3. XML 構造調査 | `dump-hellowork-raw.ts` / `dump-hellowork-tags.ts` で実レスポンスを解析 |
| 4. タグマッピング確定 | `kjno`, `jgshmei`, `shigoto_ny`, `koyokeitai_n`, `chgnkeitai_*` 等を `HelloworkJobData` にマップ |
| 5. データ品質改善 | prefecture を `shgbsjusho1_n → shgbsjusho → jgshjusho_n` の3段フォールバック化（取得率 82% → 100%）、salaryType を金額レンジから推定 |
| 6. 本番投入 | 1000 件を Supabase に upsert（エラー 0、113秒） |
| 7. `/hw-jobs` 修復 | 旧 connector 依存だったページを Prisma DB ベースに書き換え |
| 8. Cron 構築 | `/api/cron/hellowork-import` 追加、`vercel.json` で毎日 04:00 UTC スケジュール |
| 9. main マージ＆Vercel デプロイ | submain → main に merge、Vercel で本番反映 |
| 10. Cron 動作確認 | 手動 curl で HTTP 200 確認、closeOrphans の事故対応＆デフォルトを安全側に修正 |

### 6.3 重要なバグ修正の記録

| コミット | 内容 |
|---|---|
| `ea632fc` | extractToken が XML 宣言の `version="1.0"` から `"1.0"` を拾っていた問題を修正 |
| `a28f93b` | `data_id` (snake_case) タグの正規表現を追加 |
| `cc69431` | `closeOrphans` のデフォルトを安全側 (false) に変更（部分取り込み時の誤 closed 防止） |

---

## 7. 残タスク（優先度順）

### 7.1 [P1] 全国 36 万件取り込み戦略 ✅ 実装済み（DB 反映待ち）

**採用方針**: (a) dataId ローテーション + (b) ページローテーションの組み合わせ。DB の `import_progress` テーブルで状態管理。

**実装内容**:

| ファイル | 役割 |
|---|---|
| `prisma/schema.prisma` | `ImportProgress` モデル追加（`source` × `dataId` の unique キー） |
| `src/lib/crawler/hellowork.ts` | `fetchPagesFromDataId(token, dataId, startPage, pageCount)` / `fetchDataIds()` を追加 |
| `src/lib/crawler/rotation-planner.ts` | `planNextRotation` / `recordBatchResult` / `syncDataIds`。次に取り込むべき (dataId, startPage) を DB から決定 |
| `src/app/api/cron/hellowork-import/route.ts` | ローテーション対応に書き換え。任意で `?dataId=&page=&pages=` で手動オーバーライド可能 |
| `src/app/api/admin/hellowork/progress/route.ts` | GET で進捗確認、POST `?action=sync` で dataId 一覧再取得、POST `?action=reset` で進捗リセット |
| `scripts/hellowork-rotation.ts` | ローカル実行用 CLI（status / sync / run / reset） |

**動作仕様**:
- `exhausted=false` の dataId のうち、`lastRunAt` が最も古いものを選択 → `lastPage+1` から `pagesPerRun` ページ連続取得
- 0 件ページに到達したら `exhausted=true` に更新
- 全 dataId 完走後は自動的にリセットして次サイクル（≒ 日次差分の取り直し）
- デフォルト 2 ページ/回（≒2000 件、≒226s。`maxDuration=300s` 内）
- `closeOrphans` はローテーション中は常に `false`（部分取り込みなので）

**運用フロー（初回反映時）**:

```bash
# 1. DB マイグレーション（管理者）
pnpm prisma db push

# 2. dataId 一覧を進捗テーブルへ投入（初回 cron 実行時に自動同期されるが、明示実行も可）
pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts sync

# 3. 進捗確認
pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts status

# 4. 手動 1 バッチ実行（動作確認）
pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts run 2

# 以降は Vercel Cron が毎日 04:00 UTC（13:00 JST）に実行
```

**取り込み完了の見積もり**:
- 全国 ≒ 365 ページ。1 dataId につき 50 dataId ローテーションで 50 日 → 1 dataId あたり 1 日 1 回
- ただし dataId は都道府県別で 1 dataId あたりのページ数は少ない。実測ベースで判断
- 全国系 dataId（M100 等）は数ヶ月かかる想定

**手動オーバーライド例**:

```bash
# 特定 dataId のページ範囲を指定して取り込む
curl -X POST "https://genbacareer.jp/api/cron/hellowork-import?dataId=M100&page=10&pages=2" \
  -H "Authorization: Bearer $CRON_SECRET"

# 進捗テーブル確認
curl "https://genbacareer.jp/api/admin/hellowork/progress" \
  -H "Authorization: Bearer $ADMIN_API_KEY"

# 進捗を全件リセット（次サイクル開始）
curl -X POST "https://genbacareer.jp/api/admin/hellowork/progress?action=reset" \
  -H "Authorization: Bearer $ADMIN_API_KEY"
```

### 7.2 [P2] `closeOrphans` を有効活用する定期クリーンアップ
- 現状：`closeOrphans=true` を渡すケースがない
- 必要：全件取り込み完了後にだけ「ハローワーク側で消えた求人を closed」する仕組み
- 案：`?closeOrphans=true&fullSweep=true` モードを別 Cron として週1回実行

### 7.3 [P2] 賃金タグのフォールバック拡充
- 現状：`chgnkeitai_kagen/jgn` から取得（22% の求人にしか存在しない）
- 案：`tgktat2_*`（手当）、`shkyrt_*`（諸給与）からも給与情報を補完
- 影響：salaryMin/Max の取得率向上 → 求人検索の絞り込みでヒット数が増える

### 7.4 [P3] 会社名カラム追加
- 現状：Prisma `Job` モデルに会社名カラムが無く、HW 求人は `companyId = null`、`HwJob.company.name` も常に null
- 案：
  - 案 A: `Job` に `sourceCompanyName String?` カラム追加
  - 案 B: HW 求人ごとに `Company` レコードを upsert（会社単位のページが作れる）
- 推奨：案 A（軽量、影響小）

### 7.5 [P3] ブランチクリーンアップ
- 過去セッションで残った `claude/*` ブランチがリモートに残存している（`add-article-thumbnails-Q9rFY`, `analyze-magazine-articles-xLdpf` 等）
- リモート権限の都合で `git push --delete` が失敗する。GitHub Web UI で削除推奨

### 7.6 [P3] 監視・通知
- 現状：Cron 失敗時に通知される仕組みがない
- 案：Vercel Logs Drain + Slack / メール通知設定
- または `/api/cron/hellowork-import` の失敗時に外部 webhook を叩く

### 7.7 [P4] スクリプト整理
- `scripts/dump-hellowork-raw.ts` `dump-hellowork-tags.ts` はデバッグ用途で本番には不要
- 残しても害はないが、`scripts/debug/` サブディレクトリへ移動する案

---

## 8. トラブルシュート

### `HTTP 401 Unauthorized` が curl で返る
- Vercel の `CRON_SECRET` とローカルの値が不一致
- **対処**：Vercel で Delete & Add で上書き → Redeploy（Build Cache 外す）→ ローカルでも `export CRON_SECRET="$(...)"` で再セット

### `closed: 990` のような大量 closed が出た
- 部分取り込み（`maxJobs=10` など）で `closeOrphans=true` が効いた事故
- **対処**：`UPDATE jobs SET status='active' WHERE source='hellowork' AND status='closed';` で復旧
- **予防**：`closeOrphans` のデフォルトは false（修正済み `cc69431`）。明示的に `?closeOrphans=true` を付けたときのみ有効

### XML パースで件数が 0 件になる
- API 側のタグ命名が変わった可能性（snake_case ↔ camelCase など）
- **対処**：`scripts/dump-hellowork-tags.ts` で実構造を確認し、`hellowork.ts` の `toHelloworkJobData` のキー名マッピングを更新

### トークン取得で短い文字列が返る
- レスポンス XML 構造が `<root><token>...</token></root>` でない場合
- `extractToken` のフォールバックロジックで「16文字未満は採用しない」になっているが、それでも誤抽出する場合あり
- **対処**：`scripts/dump-hellowork-raw.ts` で生レスポンスを確認

### Next.js dev で `Can't resolve 'tailwindcss'` エラー
- ホーム直下 `~/package-lock.json` が workspace root を誤推論させる
- **対処**：`mv ~/package-lock.json ~/package-lock.json.bak` し、`rm -rf .next` してから `pnpm dev`

---

## 9. デプロイ／インフラ情報

| 項目 | 値 |
|---|---|
| 本番ドメイン | `https://genbacareer.jp` |
| Vercel プロジェクト | `let_kyujin`（Production Branch: `main`） |
| Supabase プロジェクト | `let_kyujin / main` |
| GitHub | `eijiyoshikawa/let_kyujin` |
| Vercel Cron | 毎日 `0 4 * * *` (UTC) = 13:00 JST |

### 既存 Cron 一覧（vercel.json）

```json
{
  "crons": [
    { "path": "/api/cron/expire-jobs",        "schedule": "0 3 * * *" },
    { "path": "/api/cron/hellowork-import",   "schedule": "0 4 * * *" }
  ]
}
```

---

## 10. 関連ドキュメント

- `docs/JOBS_API_INTEGRATION.md` — 旧 connector 設計（参考のみ。現状は本ドキュメントが正）
- `scripts/README.md` — スクリプト個別の使い方
- `DESIGN_HANDOVER.md` — デザインリニューアルの引き継ぎ
- `ARTICLE_PROJECT_HANDOVER.md` — マガジン記事プロジェクトの引き継ぎ
- `CLAUDE.md` — リポジトリ全体のコーディングルール

---

## 11. セッション再開時のクイックスタート

新セッションでこの作業を引き継ぐ場合、以下の順で進めると最短でコンテキストを把握できます：

1. このドキュメント全体を読む
2. `scripts/README.md` を読む
3. `src/lib/crawler/hellowork.ts` を読む（API クライアント実装）
4. `src/lib/crawler/import-batch.ts` を読む（DB upsert）
5. `vercel.json` を読む（Cron 設定）
6. Vercel ダッシュボードで Logs を確認（前日 13:00 JST の Cron が成功しているか）
7. 残タスク 7.1〜7.7 から優先度に応じて着手

不明点は **`scripts/test-hellowork-api.ts`** を実行して挙動を確認するのが最速です。
