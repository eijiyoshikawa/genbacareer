# 記事管理 — 運用ハンドブック

> 建設業特化記事 399 件を Supabase に投入し、本番 https://genbacareer.jp/journal で公開済み。
> 今後「記事を追加する」「本文を増やす」「修正する」作業をすぐ再開できるようにまとめた運用ドキュメント。

## 0. 現在のステータス

| 項目 | 状態 |
|---|---|
| 記事プラン | 399 件（`prisma/seed-data/article-plans.ts`） |
| 記事 HTML | 399 件（`prisma/seed-data/articles/*.html`） |
| DB 投入 | ✅ 完了（Supabase `articles` テーブル） |
| 本番公開 | ✅ 完了 https://genbacareer.jp/journal |
| featured 記事 | 先頭 3 件（転職・職種・業界の代表記事） |
| 本文拡充 | ✅ 完了（全 399 件が可視テキスト 2,000 字以上） |
| カバー画像 | ✅ 完了（Picsum Photos、`imageUrl` フィールドで管理） |

## 1. システム構成

### ファイルと役割

```
prisma/
├── schema.prisma                    # Article モデル定義
└── seed-data/
    ├── article-plans.ts             # 全記事のメタ情報（slug, title, category, tags, excerpt）
    ├── seed-articles.ts             # DB upsert スクリプト
    └── articles/
        ├── construction-industry-overview-2026.html
        ├── tunnel-worker.html
        └── ... (ここに HTML 本文ファイル)
```

### データフロー

```
article-plans.ts (配列ループ)
      ↓
  slug ごとに articles/<slug>.html を読み込み
      ↓
  prisma.article.upsert()   ← create or update
      ↓
  Supabase articles テーブル
      ↓
  src/app/journal/page.tsx が DB 直読みでレンダリング
      ↓
  https://genbacareer.jp/journal で公開（即反映）
```

### 設計のポイント

- **upsert ベース**: 何度実行しても安全。既存レコードは更新、未存在は新規作成
- **update 時に保護されるフィールド**: `featured`, `publishedAt`, `viewCount`
  - 管理画面で featured を変更しても、seed 再実行で壊れない
  - 公開日が意図せずずれることもない
- **update 時に上書きされるフィールド**: `title`, `excerpt`, `body`, `category`, `tags`, `metaDescription`
  - HTML ファイルを編集 → seed 再実行 = 本文だけ差し替わる
- **本文は HTML スニペット**: `<html>` や `<body>` タグなし
- **publishedAt は自動採番**: 2026-01-01 から 1 日 1 記事のペース（新規追加時に既存記事の publishedAt は壊れない）
- **featured は先頭 3 件**: `article-plans.ts` の index 0〜2 のみ `featured: true` で create される

## 2. 環境セットアップ（一度だけ）

```bash
# 1. クローン
git clone https://github.com/eijiyoshikawa/let_kyujin.git
cd let_kyujin

# 2. ブランチ確認（main が最新）
git checkout main
git pull origin main

# 3. .env 作成
#    本番 Supabase に直接接続する DATABASE_URL を設定
cat > .env <<'ENVEOF'
DATABASE_URL="postgresql://postgres.<project-ref>:<password>@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="dev-local-secret"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
ENVEOF

# 4. 依存インストール（tsx と prisma generate が自動実行される）
pnpm install

# 5. ローカル動作確認
pnpm dev
# → http://localhost:3000/journal で記事一覧が見えれば OK
```

### 重要な前提

- `DATABASE_URL` は **本番 Supabase プロジェクトに直接接続** します。seed を走らせると本番 DB が即座に書き換わります
- ポート 6543（Transaction pooler）経由。Prisma の prepared statement 問題を避けるため `?pgbouncer=true&connection_limit=1` を必ず付ける
- seed 実行には数十秒〜数分かかります（件数 × upsert）
- DATABASE_URL のパスワードを取得する方法: Supabase Dashboard → プロジェクト → 上部の `Connect` ボタン → `Direct` タブ → `Session pooler` 行の URL をコピー（パスワードは別途手動で置き換え、分からなければ Project Settings → Database で Reset）

## 3. ワークフロー

### ワークフロー A: 新しい記事を追加する

**例: 建築設備士の記事を 1 件追加する**

#### 1. 重複チェック

```bash
ls prisma/seed-data/articles/ | grep building-equipment-inspector
# 既存ファイルがあれば別 slug を選ぶ
```

重複履歴は §4「過去の slug リネーム履歴」も参照。

#### 2. `prisma/seed-data/article-plans.ts` に追記

配列末尾に以下の形式で追加:

```ts
{
  slug: "building-equipment-inspector-guide",
  title: "建築設備士とは — 役割と取得方法",
  category: "license", // §4「カテゴリ一覧」参照
  tags: ["資格", "建築設備"],
  excerpt: "建築設備士の役割・受験資格・合格率をわかりやすく解説します。",
},
```

#### 3. HTML 本文ファイルを作成

`prisma/seed-data/articles/building-equipment-inspector-guide.html`（ファイル名 = slug）

```html
<p>建築設備士は、建築士をサポートする建築設備の専門家です。...</p>

<h2>建築設備士の役割</h2>
<p>...</p>

<h2>受験資格</h2>
<ul>
  <li>大学卒業後に実務経験 2 年以上</li>
  <li>...</li>
</ul>

<h2>試験内容</h2>
<table>
<thead><tr><th>試験区分</th><th>内容</th></tr></thead>
<tbody>
<tr><td>一次</td><td>学科試験</td></tr>
<tr><td>二次</td><td>設計製図試験</td></tr>
</tbody>
</table>

<h2>まとめ</h2>
<p>ゲンバキャリアでは、建築・土木・設備・解体に特化した求人情報を掲載しています。ぜひチェックしてみてください。</p>
```

フォーマットルールは §4「HTML 本文フォーマット」を必ず参照。

#### 4. seed 実行

```bash
pnpm db:seed-articles
```

期待される出力:
```
Articles seed complete: 400 real content / 0 placeholder / 400 total
```

- `placeholder` が 0 でなければ、HTML ファイル名と `article-plans.ts` の slug がミスマッチ

#### 5. 本番確認

https://genbacareer.jp/journal/building-equipment-inspector-guide

DB に書いた瞬間に本番で見えるはず（Next.js の journal ページは DB 直読み、キャッシュ考慮不要）。

---

### ワークフロー B: 既存記事の本文を増やす（文字量アップ）

**例: `construction-industry-overview-2026.html` の h2 を 5 本から 10 本に拡充する**

#### 1. HTML ファイルを編集

```bash
# 好きなエディタで
code prisma/seed-data/articles/construction-industry-overview-2026.html
```

本文を拡充: h2 セクション追加、表・リスト追加、具体例の肉付け、等。

#### 2. seed 実行

```bash
pnpm db:seed-articles
```

`upsert` の `update` 節で `body` が新しい HTML に置き換わります。**`featured` / `publishedAt` / `viewCount` は保護される** ので壊れません。

#### 3. 本番確認

https://genbacareer.jp/journal/construction-industry-overview-2026

---

### ワークフロー C: 複数記事に一括変更をかける

**例: 旧名称「建設求人ポータル」→「ゲンバキャリア」に全置換**

```bash
# macOS の sed（BSD sed は -i の後に空文字が必要）
find prisma/seed-data/articles -name "*.html" -exec sed -i '' 's/建設求人ポータル/ゲンバキャリア/g' {} +

# 変更内容を git diff で確認してから
git diff prisma/seed-data/articles/

# seed 実行
pnpm db:seed-articles
```

> 💡 大量バッチ変更時は 1 記事だけ先に実行して表示確認してから、全件適用するのが安全。

---

### ワークフロー D: 特定記事を削除する

seed スクリプトは削除機能を持っていません。以下の 2 ステップで対応:

#### 1. `article-plans.ts` からエントリを削除、`articles/<slug>.html` も削除

#### 2. DB から手動で削除（Supabase Dashboard → SQL Editor）

```sql
DELETE FROM articles WHERE slug = 'obsolete-article-slug';
```

seed 再実行では **削除された記事は DB に残り続ける** 点に注意（upsert は削除を知らない）。

---

## 4. 制約・ルール

### カテゴリ一覧（変更時はスキーマ変更が必要）

| slug | 日本語表示 | 件数（現時点） |
|---|---|---|
| `industry` | 業界知識 | 111 |
| `job-type` | 職種解説 | 82 |
| `license` | 資格・免許 | 75 |
| `career` | 転職・キャリア | 56 |
| `salary` | 年収・給与 | 50 |
| `interview` | 体験談 | 25 |

⚠️ `interview` は過去バッチ 1・2 の既存分のみ。**新規追加はしない方針**（ユーザー指示）。

### slug ルール

- `^[a-z0-9-]+$`（小文字英数字とハイフンのみ）
- 一意制約あり（重複不可）
- 変更は URL 変更 = SEO への影響あり、慎重に

### HTML 本文フォーマット（バッチ 2 以降の標準）

- `<p>` で導入 → `<h2>` で見出し 10〜15 本 → `<p>` でまとめ
- 締めは「ゲンバキャリアでは〜掲載しています。ぜひチェックしてみてください。」
- `<table><thead><tr><th>...` を 1〜2 か所
- `<ul>` / `<ol>` を複数
- 文字数: 4,000〜6,000 字（HTML タグ込）
- `<html>` / `<body>` タグは含めない（本文断片として埋め込まれる）
- ですます調で統一

### 過去の slug リネーム履歴

| 旧 slug | 新 slug | バッチ |
|---|---|---|
| `construction-renovation-market` | `construction-renovation-craftsman` | batch 3 |
| `construction-salary-negotiation` | `construction-salary-negotiation-tips` | batch 3 |
| `building-equipment-inspector` | `building-equipment-inspector-cert` | batch 3 |
| `construction-social-insurance` | `construction-social-insurance-guide` | batch 4 |
| `construction-mental-health` | `construction-mental-care` | batch 5 |

## 5. トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `Can't reach database server` | DNS / ネットワーク不達 | `.env` の `DATABASE_URL` を確認。ローカル Mac から実行しているか確認 |
| `password authentication failed` | パスワード間違い | Supabase → Project Settings → Database → Reset database password。リセット後は Vercel 環境変数も更新 |
| `prepared statement "sX" already exists` | pgbouncer の既知問題 | `DATABASE_URL` に `?pgbouncer=true&connection_limit=1` が付いているか確認 |
| `P2002 Unique constraint failed on slug` | 並列実行で発生（通常起きない） | 1 プロセスで実行されているか確認 |
| `placeholder` カウントが 0 でない | HTML ファイル名と plans の slug がミスマッチ | `ls articles/*.html` と plans の slug を突き合わせ |
| 本番で更新が見えない | CDN / ISR キャッシュ | ブラウザハードリロード。改善しなければ Vercel から Redeploy |
| seed 完了まで時間がかかる | upsert は 1 件ずつシーケンシャル | 399 件で 1〜3 分は正常。気長に待つ |

## 6. セキュリティ

### パスワードの取り扱い

- `.env` は `.gitignore` 済み。絶対にコミットしない
- パスワードは本番 DB に直結しているため、漏洩すると影響大
- 以下のタイミングでローテーション推奨:
  - 本番ローンチ前
  - チャット履歴や設定ファイルを第三者共有する前
  - 会話ログを記事化・ブログ化する前

### ローテーション手順

1. Supabase → Project Settings → Database → **Reset database password** → 新パスワード発行
2. ローカル `~/let_kyujin/.env` の `DATABASE_URL` を更新
3. Vercel のプロジェクト環境変数 `DATABASE_URL` を全環境（Production / Preview / Development）更新
4. Vercel で Redeploy（環境変数は再デプロイしないと反映されない）

## 7. 関連ファイル

- `CLAUDE.md` — プロジェクト技術スタック・開発ルール
- `prisma/schema.prisma` — `Article` モデル定義
- `prisma/seed-data/seed-articles.ts` — seed ロジック本体（読むと早い）
- `src/app/journal/page.tsx` — 一覧ページ
- `src/app/journal/[slug]/page.tsx` — 詳細ページ

---

**最終更新**: 2026-04-13（本文拡充 2,000 字以上 + カバー画像追加完了）
