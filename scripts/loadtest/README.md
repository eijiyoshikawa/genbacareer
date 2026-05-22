# ゲンバキャリア ロードテスト

[k6](https://k6.io) を使った簡易ロードテスト。本番投入前 / 大型キャンペーン前のキャパシティ確認用。

## セットアップ

```bash
brew install k6
```

## 実行

### ローカル dev サーバ向け

```bash
pnpm dev                                          # ターミナル1
k6 run scripts/loadtest/genbacareer.js            # ターミナル2
```

### 本番 (or Preview) 向け ⚠️ 慎重に

```bash
BASE_URL=https://www.genbacareer.jp k6 run scripts/loadtest/genbacareer.js
```

⚠️ 本番に対して走らせると **Sentry / GA / Vercel Analytics にダミーアクセスが大量に流れる** ので、走らせる前にチームに共有 + Vercel の Spend Management 上限を確認すること。

## シナリオ

- 段階的に最大 **50 VU** (仮想ユーザ) まで負荷を上げる
- 1 ラン **約 3 分**
- 主要公開ページ (`/`, `/jobs`, `/jobs.xml`, `/tokyo`, `/jobs/[id]` etc.) をランダム巡回

## SLO (合格ライン)

| 指標 | 閾値 |
|---|---|
| **p95 応答時間** | < 1500ms |
| **HTTP エラーレート** | < 1% |

k6 はランの最後にこの閾値判定を行い、超えていたら **non-zero exit** で失敗する。

## 出力例

```
     ✓ status is 200 or 304
     ✓ response time < 3s

     checks.........................: 99.50% ✓ 1990  ✗ 10
     data_received..................: 152 MB
     errors.........................: 0.50%
     http_req_duration..............: avg=412ms  p(95)=1.2s
     http_reqs......................: 2000  10.0/s
     iterations.....................: 2000
     vus_max........................: 50
```

## 結果が NG だった場合の対処

1. **`p95 > 1500ms`** → Next.js SSR が遅い可能性
   - Sentry Performance タブで slowest transactions を確認
   - DB クエリ N+1 (Prisma の `include` 過多) を疑う
   - `/jobs` の orderBy で `rankScore` が index に乗っているか確認

2. **`errors > 1%`** → 500 エラー多発
   - Vercel Function Logs で stack trace を確認
   - DB connection pool 枯渇 (Supabase の `max_connections` 確認)
   - Edge runtime のメモリ制限超過

3. **Vercel 側のレート制限**
   - `429 Too Many Requests` が頻発する場合は Vercel WAF の Rate Limit 設定を緩める

## 注意事項

- このスクリプトは **public ページのみ** をテストする (認証必須ページや POST endpoint は含まない)
- `/api/jobs` 等の API を負荷テストしたい場合は別シナリオを作る (rate limit + guest 15 件制限あり)
- middleware の UA ブロックを通すため、`User-Agent` を `Mozilla/5.0 (compatible; k6-loadtest/1.0; ...)` にしている
