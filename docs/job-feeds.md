# 求人 XML フィード連携 (多媒体配信)

## 概要

ゲンバキャリアの直接掲載求人を、各種求人アグリゲータに XML フィードで配信する仕組みです。

主要 JP 媒体 (Indeed / 求人ボックス / スタンバイ / Glassdoor / Careerjet / Jooble) は **Indeed 互換 XML** を共通仕様として採用しているため、**1 つのフィード URL** で全てに対応できます。

`?source=PLATFORM` クエリパラメータで求人 URL に **UTM トラッキング** を埋め込み、各媒体からの流入を GA4 で計測可能です。

## フィード URL

| 用途 | URL |
|---|---|
| 共通 (UTM なし) | `https://www.genbacareer.jp/jobs.xml` |
| Indeed | `https://www.genbacareer.jp/jobs.xml?source=indeed` |
| 求人ボックス | `https://www.genbacareer.jp/jobs.xml?source=kyujinbox` |
| スタンバイ | `https://www.genbacareer.jp/jobs.xml?source=stanby` |
| Glassdoor | `https://www.genbacareer.jp/jobs.xml?source=glassdoor` |
| Careerjet | `https://www.genbacareer.jp/jobs.xml?source=careerjet` |
| Jooble | `https://www.genbacareer.jp/jobs.xml?source=jooble` |

`?source=` を指定すると、各 `<url>` フィールドが以下のように UTM 付きで出力されます:

```
https://www.genbacareer.jp/jobs/<id>?utm_source=kyujinbox&utm_medium=feed&utm_campaign=job_feed
```

これにより GA4 → 集客 → トラフィック獲得で各媒体の効果が見えるようになります。

## 配信対象 (絞り込み条件)

| 条件 | 値 |
|---|---|
| Job.status | `active` |
| Job.source | `direct` (HelloWork は除外) |
| Company.planType | `success_fee` / `monthly_12` / `monthly_24` / `sns_client` |
| プラン状態 | アクティブ (期限内) |

**campaign_free 枠は除外**。¥0 無期限掲載のため外部配信コストに見合わない判断。

## XML フォーマット (Indeed 仕様)

```xml
<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher><![CDATA[ゲンバキャリア]]></publisher>
  <publisherurl><![CDATA[https://www.genbacareer.jp]]></publisherurl>
  <lastBuildDate><![CDATA[Thu, 21 May 2026 12:00:00 GMT]]></lastBuildDate>
  <job>
    <title><![CDATA[施工管理スタッフ]]></title>
    <date><![CDATA[Thu, 21 May 2026 09:00:00 GMT]]></date>
    <referencenumber><![CDATA[550e8400-...]]></referencenumber>
    <url><![CDATA[https://www.genbacareer.jp/jobs/550e8400-?utm_source=indeed&utm_medium=feed&utm_campaign=job_feed]]></url>
    <company><![CDATA[株式会社サンプル]]></company>
    <city><![CDATA[新宿区]]></city>
    <state><![CDATA[東京都]]></state>
    <country><![CDATA[JP]]></country>
    <description><![CDATA[<p>建築現場の施工管理</p>]]></description>
    <salary><![CDATA[¥300,000 〜 ¥500,000 / 月]]></salary>
    <jobtype><![CDATA[fulltime]]></jobtype>
    <category><![CDATA[management]]></category>
  </job>
</source>
```

## 各媒体の登録手順

### 1. Indeed

1. https://employers.indeed.com/ にログイン
2. Source Posting / XML Feed 設定を開く
3. Feed URL = `https://www.genbacareer.jp/jobs.xml?source=indeed`
4. Refresh = Daily
5. Source name = ゲンバキャリア
6. 検証 (1-3 営業日) → Active

### 2. 求人ボックス (カカクコム)

1. https://corp.kakaku.com/service/job/ から営業に問い合わせ
2. 媒体担当者経由で XML 連携の申請
3. Feed URL = `https://www.genbacareer.jp/jobs.xml?source=kyujinbox`
4. 取り込み頻度: 通常 1 日 1 回
5. **Indeed 互換 XML を受理** するため、別形式は不要

### 3. スタンバイ (LINEヤフー)

1. https://corporate.stanby.co.jp/ から営業窓口
2. XML フィード連携を申請
3. Feed URL = `https://www.genbacareer.jp/jobs.xml?source=stanby`

### 4. Glassdoor

1. https://www.glassdoor.com/employers/ にログイン
2. Job Postings → XML Feed setup
3. Feed URL = `https://www.genbacareer.jp/jobs.xml?source=glassdoor`
4. Glassdoor は Indeed 同一グループなので同じフィードでカバー可

### 5. Careerjet

1. https://www.careerjet.jp/employer.html
2. XML feed 登録

### 6. Jooble

1. https://jp.jooble.org/about-employers

## ローカル確認

```bash
pnpm dev
curl http://localhost:3000/jobs.xml | head -50
curl http://localhost:3000/jobs.xml?source=kyujinbox | head -50
```

XML 構文チェック:
```bash
curl https://www.genbacareer.jp/jobs.xml | xmllint --noout -
```

`<url>` 内に utm_source が入っているか:
```bash
curl https://www.genbacareer.jp/jobs.xml?source=kyujinbox | grep utm_source | head -3
```

## GA4 での流入計測

UTM タグが正しく埋め込まれていれば、GA4 → レポート → 集客 → トラフィック獲得で:

| utm_source | media | 求人クリック数 |
|---|---|---|
| indeed | feed | XXX |
| kyujinbox | feed | XXX |
| stanby | feed | XXX |

のような形で各媒体の貢献度が可視化されます。

求人詳細ページ (`/jobs/[id]`) は既に GA4 を実装しているので、UTM 付き URL でアクセスされれば自動的に拾われます。

## キャッシュ

`Cache-Control: public, s-maxage=3600, stale-while-revalidate=300`

- Vercel CDN で 1 時間キャッシュ
- 各媒体は 1 日 1 回程度のフェッチなので十分
- 緊急更新が必要なら Vercel ダッシュボードで Cache Purge

## 件数上限

1 フィードあたり最大 5,000 件 (`MAX_JOBS = 5_000`)。
direct 企業の active 求人だけなので余裕で収まります。

将来 5,000 件を超える場合は `/jobs.xml?page=N` でページング対応を追加する想定。

## トラブルシューティング

### 求人が媒体に表示されない

1. **企業のプラン種別を確認** — `campaign_free` だと配信されない
2. **Job.status='active'** か確認
3. **Company.source='direct'** か確認 (HelloWork 取り込みは対象外)
4. **媒体側の検証ログ** を確認

### XML 構文エラー

`description` に `]]>` が含まれていないか確認。
`renderIndeedJobEntry` で自動エスケープされる仕組みになっています。

### UTM が反映されていない

`?source=` が **JOB_FEED_PLATFORMS** リストに無い ID だと no-op (UTM なし) で動作します。
正しい ID は `src/lib/job-feed-platforms.ts` 参照。

## Phase B: Apply 連携 (リリース後対応予定)

各媒体の応募連携 API (Indeed Apply / 求人ボックス Apply 等) は審査と工数が必要なため、リリース後に Phase B として着手予定。

実装には:
- 媒体ごとの Apply API 利用申請 (1-2 ヶ月のリードタイム)
- 応募データ受け取り Webhook
- Application モデルへの自動レコード作成
- 媒体側の Apply ボタン表示審査
