# HelloWork 求人情報提供 API スクリプト集

ハローワーク求人・求職情報提供サービス（公式 API）連携用のスクリプト群です。

API エンドポイント: `https://teikyo.hellowork.mhlw.go.jp/teikyo/api/2.0/`

## 必要な環境変数

`.env.local` に以下を設定:

```
HELLOWORK_API_USER=<メールアドレス形式の ID>
HELLOWORK_API_PASS=<英数のパスワード>
DATABASE_URL=<Supabase 接続文字列>      # 取り込み実行時のみ必要
ADMIN_API_KEY=<任意の長い文字列>         # /api/admin/hellowork/import 経由の起動時のみ
CRON_SECRET=<任意の長い文字列>           # /api/cron/hellowork-import 経由の起動時のみ
```

## スクリプト一覧

### 動作確認・デバッグ系

| スクリプト | 用途 | DB 接続 |
|---|---|---|
| `test-hellowork-api.ts` | getToken → 求人取得 → delToken の疎通確認（先頭1件のメタ情報のみ） | 不要 |
| `dump-hellowork-raw.ts` | 4 エンドポイントの生 XML をそのまま表示（XML 構造の調査用） | 不要 |
| `dump-hellowork-tags.ts` | `/kyujin/{ID}/1` レスポンスのタグ統計（出現回数・最大値長） | 不要 |
| `dryrun-hellowork-import.ts` | 100 件取得＋データ品質サマリ＋ dry-run import（DB 書き込みなし） | **要**（findUnique のみ） |

### 本番投入系

| スクリプト | 用途 | DB 接続 |
|---|---|---|
| `run-hellowork-import.ts` | **実 DB に upsert** する（デフォルト 1000 件 / closeOrphans=false） | 必要 |
| `hellowork-rotation.ts` | ローテーション戦略（P1）の状態確認・実行・リセット | 必要 |

`run-hellowork-import.ts` の環境変数オプション:
- `HW_IMPORT_MAX_JOBS` (default: 1000)
- `HW_IMPORT_CLOSE_ORPHANS` (default: false) — `true` にすると今回バッチに含まれない HW 求人を closed にする

### 実行例

```bash
# 疎通確認
pnpm tsx --env-file=.env.local scripts/test-hellowork-api.ts

# データ品質確認 (dry-run)
pnpm tsx --env-file=.env.local scripts/dryrun-hellowork-import.ts

# 本番取り込み (1000件)
pnpm tsx --env-file=.env.local scripts/run-hellowork-import.ts

# 本番取り込み (10件だけテスト)
HW_IMPORT_MAX_JOBS=10 pnpm tsx --env-file=.env.local scripts/run-hellowork-import.ts

# ローテーション戦略（P1）
pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts status   # 進捗確認
pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts sync     # dataId 一覧を進捗テーブルへ
pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts run 2    # 2 ページ取り込み
pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts reset    # 進捗リセット（dataId 引数で個別指定可）
```

## ロールバック

```sql
DELETE FROM jobs WHERE source = 'hellowork';
```

## Cron 設定

`vercel.json` に登録済み:

```json
{
  "crons": [
    { "path": "/api/cron/hellowork-import", "schedule": "0 4 * * *" }
  ]
}
```

毎日 04:00 UTC（13:00 JST）に `/api/cron/hellowork-import` が呼ばれる。

### Vercel への設定手順

Vercel ダッシュボード → Project Settings → Environment Variables に以下を登録:

- `HELLOWORK_API_USER`
- `HELLOWORK_API_PASS`
- `CRON_SECRET`（任意の長い文字列。Vercel Cron が自動で Bearer ヘッダーに付与する）
- `DATABASE_URL`（既設の想定）

### 手動起動

Cron エンドポイントを手動で叩く場合:

```bash
curl -X POST https://www.genbacareer.jp/api/cron/hellowork-import \
  -H "Authorization: Bearer $CRON_SECRET"
```

クエリで挙動制御:

```bash
# 任意の dataId × ページから N ページ取り込む（手動オーバーライド）
curl -X POST "https://www.genbacareer.jp/api/cron/hellowork-import?dataId=M100&page=10&pages=2" \
  -H "Authorization: Bearer $CRON_SECRET"

# 1 回あたりのページ数だけ変えて、対象は DB 進捗から自動選択
curl -X POST "https://www.genbacareer.jp/api/cron/hellowork-import?pages=1" \
  -H "Authorization: Bearer $CRON_SECRET"

# closeOrphans を有効化（14 日以上再取得されていない HW 求人のみ closed にする。
# staleness ベースなので毎バッチ実行しても安全 — 1 回のバッチに含まれないだけでは closed にならない）
curl -X POST "https://www.genbacareer.jp/api/cron/hellowork-import?closeOrphans=true" \
  -H "Authorization: Bearer $CRON_SECRET"
```

## 取り込みデータ仕様

API レスポンスの主要タグ → `HelloworkJobData` マッピング:

| HelloworkJobData | API タグ | 備考 |
|---|---|---|
| `helloworkId` | `kjno` | 求人番号（unique） |
| `companyName` | `jgshmei` | 事業所名 |
| `description` / title 代用 | `shigoto_ny` | 仕事内容 |
| `employmentType` | `koyokeitai_n` | 雇用形態 |
| `address` | `shgbsjusho` → `jgshjusho_n` | 就業場所住所 |
| `prefecture` / `city` | `shgbsjusho1_n` → `shgbsjusho` → `jgshjusho_n` | 都道府県/市区町村 |
| `salaryMin` / `salaryMax` | `chgnkeitai_kagen` / `chgnkeitai_jgn` | 賃金（一部の求人にのみ存在） |
| `salaryType` | `chgnkeitai` → 金額レンジ推定 | monthly/hourly/annual |
| `requirements` | `menkyo_skku3_n` | 必要な免許 |

## 既知の制約

- 公式 API は **検索条件での絞り込み非対応**（職種・賃金・資格等）。全件取得して自前 DB で絞り込む設計。
- トークンは **発行当日のみ有効**。日跨ぎは再発行が必要。
- データ ID は都道府県別 (`M101`〜`M147`) + 全国 (`M100`) + 障害者 (`M200`) + 大卒 (`M300`)。1 ページ最大 1000 件、ページング有り。
- 賃金タグは全求人の **約 22%** にしか存在しない（API 側の特性）。
