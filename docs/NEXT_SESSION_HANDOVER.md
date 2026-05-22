# 次セッション引き継ぎ — 全件取り込み + 建設業特化

**最終更新**: 2026-05-09
**担当ブランチ**: `claude/api-handover-review-jKL2I`

---

## 1. これまでの実装サマリ（直近〜現在）

| # | 実装 | PR | コミット |
|---|---|---|---|
| 1 | HelloWork 公式 API 連携・1000 件本番投入・Vercel Cron 稼働 | merged | `2e64720` ほか |
| 2 | 全国 36 万件取り込み用ローテーション戦略（`import_progress` テーブル + `rotation-planner`） | merged | `09904ec` |
| 3 | メール認証・出願時の企業通知 | #3 merged | `272de9b` |
| 4 | Rate limiting / OG image / `/[prefecture]` ランディング / GitHub Actions CI | #4 merged | `4641f28` |
| 5 | OAuth 検証・問い合わせフォーム・ヘルプセンター骨組 | #5 merged | `178d3e5` |
| 6 | 企業承認フロー（`Company.status` pending/approved/rejected） | #6 merged | `90559e7` |
| 7 | 特商法ページ・`<img>` → `next/image` 移行 | #7 merged | `b119c0f`, `a8a1a28` |
| 8 | **マネーフォワード クラウド請求書** を Stripe と併用可能に | **#10 (open)** | `13614f7` |

### PR #10 の現状

- ブランチ: `claude/api-handover-review-jKL2I`
- CI: Lint/Typecheck/Test **進行中**、Vercel Preview ✅
- 残: マージ後に `pnpm prisma db push`（`Company.paymentMethod` ほか追加）

---

## 2. プロジェクト概要

- **サイト**: ゲンバキャリア（`genbacareer.jp`）
- **コンセプト**: ノンデスク産業特化型求人サイト
- **データ源**: 厚労省 HelloWork 公式 API（`teikyo.hellowork.mhlw.go.jp`）
- **現在の DB 状況**: `jobs` テーブルに約 1,000 件（`source = 'hellowork'`）

### サイトカテゴリ定義（`src/lib/categories.ts`）

```ts
construction  // 建築・躯体工事
civil         // 土木工事
electrical    // 電気・設備工事
interior      // 内装・仕上げ工事
demolition    // 解体・産廃
driver        // ドライバー・重機
management    // 施工管理・現場監督
survey        // 測量・設計
other         // その他
```

→ **既にカテゴリ体系は建設業特化**だが、現在の取り込み処理 (`src/lib/crawler/import-batch.ts:113`) の `inferCategory` は古いカテゴリ（`construction|driver|manufacturing|office|sales|service|it`）にマップしてしまっており、**`manufacturing|office|sales|service|it` 等の非建設業ジョブも DB に入ってしまう**。

---

## 3. 次セッションでやるべきこと（最優先）

### A. 全件取り込み（HelloWork 約 36 万件）

ローテーション戦略は実装済み。あとは流すだけ。

- **ローカル実行（推奨）**: `scripts/run-hellowork-import.ts` を連続実行
- **本番 Vercel Cron**: 既に毎日 04:00 UTC に 2 ページ/回で稼働中（自動進捗）
- 1 dataId あたり 1,000 件×複数ページ。`import_progress` テーブルで進捗管理。

### B. 建設業のみに絞る（2 つのアプローチ、**両方推奨**）

#### B-1. 取り込み時に非建設業をスキップ（推奨・DB を綺麗に保つ）

`src/lib/crawler/import-batch.ts` の `inferCategory` を建設業 9 カテゴリにリマップ + 該当しないジョブを **import 時にスキップ**。

**新しい inferCategory 設計**:

```ts
const CONSTRUCTION_PATTERNS: Array<{ category: CategoryValue; patterns: RegExp }> = [
  { category: "civil",        patterns: /土木|舗装|道路|河川|橋梁|トンネル|造成/ },
  { category: "electrical",   patterns: /電気工事|設備工事|空調|衛生|配管|配線|消防/ },
  { category: "interior",     patterns: /内装|仕上げ|塗装|防水|クロス|タイル|左官/ },
  { category: "demolition",   patterns: /解体|産廃|アスベスト|スクラップ/ },
  { category: "driver",       patterns: /ドライバー|運転手|重機|オペレーター|クレーン|ダンプ/ },
  { category: "management",   patterns: /施工管理|現場監督|現場代理人|工事主任|現場所長/ },
  { category: "survey",       patterns: /測量|設計|CAD|積算/ },
  { category: "construction", patterns: /建設|建築|躯体|鳶|鉄筋|型枠|大工|足場|基礎/ },
]

// マッチしなければ null を返す → import 時にスキップ（非建設業）
function inferCategory(title: string, description: string | null | undefined): CategoryValue | null {
  const text = `${title} ${description ?? ""}`.toLowerCase()
  for (const { category, patterns } of CONSTRUCTION_PATTERNS) {
    if (patterns.test(text)) return category
  }
  return null
}
```

`importHelloworkJobs` 内で `inferCategory` が `null` を返したら upsert をスキップしカウントだけ取る（`skipped` 件数として返却）。

#### B-2. サイト表示クエリで建設業フィルタ（保険・既存データ対応）

念のため `/jobs`, `/api/jobs` 系の Prisma クエリに以下を追加：

```ts
where: {
  category: { in: ["construction","civil","electrical","interior","demolition","driver","management","survey"] },
  // ...
}
```

または、`other` も含めて全カテゴリにしておき、B-1 だけで担保するのもアリ。

---

## 4. 次セッションでの作業手順（推奨フロー）

1. **PR #10 を確認・必要ならマージ**（マネフォ機能）
2. ブランチ作成: `claude/construction-only-import`
3. **B-1 を実装**:
   - `src/lib/crawler/import-batch.ts` の `inferCategory` を建設業 9 カテゴリに書き換え
   - `null` を返したジョブを upsert スキップする処理を追加
   - `importHelloworkJobs` の戻り値に `skipped` を含める
   - 既存 `jobs` テーブルから非建設業データを削除する SQL（dry-run 確認）:
     ```sql
     DELETE FROM jobs
     WHERE source = 'hellowork'
       AND category NOT IN ('construction','civil','electrical','interior','demolition','driver','management','survey','other');
     ```
4. **B-2 を実装（保険）**: `src/app/jobs/page.tsx`, `src/app/api/jobs/route.ts`, `/[prefecture]` 等の where 条件にカテゴリ絞り込みを追加
5. **取り込み実行**:
   - ローカル: `pnpm tsx scripts/run-hellowork-import.ts` を回して全件処理
   - もしくは本番 cron 待ち（既に稼働中）
6. **確認**:
   - `SELECT category, COUNT(*) FROM jobs GROUP BY category;` で建設業 9 カテゴリのみ存在することを確認
   - `/jobs` をブラウザで開き、建設業以外のジョブが表示されないこと
7. **コミット・PR・購読**

---

## 5. 既知の注意点

- **Prisma カラム追加が未反映**: PR #10 で `Company.paymentMethod` などを追加したが、本番 DB には未反映。マージ後に必ず `pnpm prisma db push`。
- **`closeOrphans` フラグ**: cron で `false` 必須（`true` だと部分取り込みで他のジョブが closed になる）。週次 fullSweep のみ `true` 推奨。
- **セキュリティ強化（CSP / 監査ログ / 暗号化）**: 別タスクとして温存中。建設業特化と並行実施は避ける。

---

## 6. 次セッション用プロンプト（コピペ用）

```
ブランチ `claude/construction-only-import` を作って、ゲンバキャリアを建設業特化に絞り込んでください。

## やること
1. PR #10（マネフォ請求書）が未マージなら CI 確認後にマージ → `pnpm prisma db push`
2. `src/lib/crawler/import-batch.ts` の `inferCategory` を `src/lib/categories.ts` の建設業 9 カテゴリ
   (construction/civil/electrical/interior/demolition/driver/management/survey) に再マップ
3. マッチしないジョブは import 時にスキップ（戻り値に `skipped` を含める）
4. 既存 DB の非建設業データを削除（dry-run で件数確認後に DELETE）
5. `/jobs`, `/api/jobs` 系の Prisma where に建設業カテゴリの絞り込みを追加（保険）
6. HelloWork 全件取り込みを実行（`pnpm tsx scripts/run-hellowork-import.ts` を回すか cron に任せる）
7. `SELECT category, COUNT(*) FROM jobs GROUP BY category` で建設業のみになっていることを確認
8. ビルド / 型チェック / lint / test → コミット → PR → 購読

詳細仕様は `docs/NEXT_SESSION_HANDOVER.md` を参照。
```
