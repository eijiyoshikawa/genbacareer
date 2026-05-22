# Indeed XML フィード連携 (Phase A)

## 概要

ゲンバキャリアの直接掲載求人を Indeed に配信するための XML フィード仕様 + 登録手順。

- **配信 URL**: `https://www.genbacareer.jp/jobs.xml`
- **フォーマット**: Indeed 公式 XML フィード仕様 ([docs](https://docs.indeed.com/job-listings/job-feed))
- **更新頻度**: リアルタイム生成 (1 時間キャッシュ)
- **Indeed フェッチ頻度**: 通常 1 日 1 回

## 配信対象 (フィルタ条件)

| 条件 | 値 |
|---|---|
| Job.status | `active` |
| Job.source | `direct` (HelloWork は除外) |
| Company.planType | `success_fee` / `monthly_12` / `monthly_24` / `sns_client` |
| プラン状態 | アクティブ (期限内) |

**campaign_free 枠は除外**。¥0 無期限掲載のため Indeed 外部配信コストに見合わない判断。

## Indeed 側の登録手順

1. Indeed for Employers ダッシュボードにログイン
   - https://employers.indeed.com/
2. 「Source Posting」または「XML Feed」設定を開く
3. 以下を入力:
   - **Feed URL**: `https://www.genbacareer.jp/jobs.xml`
   - **Refresh schedule**: Daily
   - **Source name**: ゲンバキャリア
4. 初回フェッチ後、Indeed 側で検証が走る (通常 1-3 営業日)
5. 検証 OK → indeed.com の検索結果に求人が表示開始

## XML フォーマット例

```xml
<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher><![CDATA[ゲンバキャリア]]></publisher>
  <publisherurl><![CDATA[https://www.genbacareer.jp]]></publisherurl>
  <lastBuildDate><![CDATA[Thu, 21 May 2026 12:00:00 GMT]]></lastBuildDate>
  <job>
    <title><![CDATA[施工管理スタッフ]]></title>
    <date><![CDATA[Thu, 21 May 2026 09:00:00 GMT]]></date>
    <referencenumber><![CDATA[550e8400-e29b-41d4-a716-446655440000]]></referencenumber>
    <url><![CDATA[https://www.genbacareer.jp/jobs/550e8400-...]]></url>
    <company><![CDATA[株式会社サンプル]]></company>
    <city><![CDATA[新宿区]]></city>
    <state><![CDATA[東京都]]></state>
    <country><![CDATA[JP]]></country>
    <description><![CDATA[<p>建築現場の施工管理</p>]]></description>
    <salary><![CDATA[¥300,000 〜 ¥500,000 / 月]]></salary>
    <jobtype><![CDATA[fulltime]]></jobtype>
    <category><![CDATA[management]]></category>
  </job>
  <!-- ... 他の求人 ... -->
</source>
```

## フィールドマッピング

| Indeed フィールド | ゲンバキャリア DB | 備考 |
|---|---|---|
| `title` | Job.title | |
| `date` | Job.publishedAt | RFC 822 形式 (UTC) |
| `referencenumber` | Job.id | UUID。Indeed の重複検出に使われる |
| `url` | `${BASE_URL}/jobs/${id}` | 求人詳細ページ |
| `company` | Job.company.name | |
| `city` | Job.city | 市区町村 |
| `state` | Job.prefecture | 都道府県 |
| `country` | 固定 `JP` | |
| `description` | Job.description | HTML 可 |
| `salary` | Job.salaryMin/Max + salaryType | 例: `¥300,000 〜 ¥500,000 / 月` |
| `jobtype` | Job.employmentType | `full_time` → `fulltime` 等にマップ |
| `category` | Job.category | カテゴリ slug |

## 件数上限

1 フィードあたり最大 5,000 件。
direct 企業の active 求人だけなので余裕で収まる想定。
将来 5,000 件を超える場合は `/jobs.xml?page=N` でページング対応を追加。

## 確認方法

### ローカル確認

```bash
pnpm dev
curl http://localhost:3000/jobs.xml | head -50
```

### 本番 (デプロイ後)

```bash
curl https://www.genbacareer.jp/jobs.xml | xmllint --format - | head -100
```

XML 構文チェック:

```bash
curl https://www.genbacareer.jp/jobs.xml | xmllint --noout -
```

エラー無し (exit 0) なら OK。

### Indeed 側の取り込みステータス

Indeed for Employers ダッシュボード → Source Posting → ステータス表示:
- `Pending Validation` — 初回審査中
- `Active` — 取り込み開始
- `Errors` — 形式エラーがあると停止。詳細は同画面で確認

## トラブルシューティング

### 求人が Indeed に表示されない

- 企業のプラン種別を確認 (`campaign_free` だと配信されない)
- Job.status='active' か確認
- Company.source='direct' か確認 (HelloWork 取り込みは対象外)
- Indeed 側の検証ログを確認

### XML 構文エラー

`description` に `]]>` が含まれていないか確認。
`renderIndeedJobEntry` で自動エスケープされる仕組みになっているが、念のため。

### キャッシュが古い

CDN キャッシュ (1 時間 + SWR 5 分) があるため、即時反映が必要な場合は Vercel ダッシュボードでキャッシュ purge。

## Phase B (Indeed Apply 連携) について

Phase B として「Indeed 上で応募完了 → ATS 連携」が予定されている。

実装には:
- Indeed Apply API の利用申請 (約 1-2 ヶ月のリードタイム)
- 応募データの受け取り Webhook
- Application モデルへの自動レコード作成
- Indeed 側の Apply ボタン表示審査

リリース後に着手予定。
