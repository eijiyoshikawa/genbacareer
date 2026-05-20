# ゲンバキャリア化作業 進捗ノート

このノートは、既存 XWork クローン的求人ポータル (`let_kyujin` リポジトリ) を
「ゲンバキャリア」（ノンデスク産業特化型求人サイト）に作り変える長期作業の
**セッション間 / context 圧縮を跨いだ引き継ぎ用** メモ。

最終更新: 2026-05-20
作業ブランチ: `claude/pending-content-G2KNe`

---

## 関連ドキュメント

| パス | 役割 |
|---|---|
| `CLAUDE.md` | ブランド・技術スタック・開発ルール |
| `docs/feature-decisions.md` | 100+ 機能の やる/やらない 決定一覧 |
| `docs/architecture_genbacareer.md` | システム構成・データモデル・フェーズ計画 |
| `docs/PROGRESS_GENBACAREER.md` | このノート |
| `SESSION_HANDOVER.md` | 旧 XWork クローン時代の引き継ぎノート（参考） |

---

## これまでに完了した作業

### Phase 0: 計画策定（完了）

- ✅ 100+ 機能のアンケート集計（1.x〜17.x）
- ✅ feature-decisions.md 作成（やる 76 件 / やらない 24 件）
- ✅ architecture_genbacareer.md 作成（システム構成・Prisma 拡張・フェーズ計画）
- ✅ 不明だった 11 項目（7.1〜7.4, 9.3〜9.7, 10.2/10.3）の名称を業界標準的に確定

### Phase 1: クリーンアップ（着手中）

- ✅ **12.4 スカウト機能 削除** — Scout / ScoutTemplate モデル + 関連 6 API + 3 ページ + 3 コンポーネント + lib/help/email/notif 修正（コミット `81158f9`）
- ⏸ **11.10 保存検索アラート** — 設計では「やらない」だが実装済み。ユーザー判断で**削除せず、設計を「採用」に変更**する方針。
- ⏸ **14.6 LINE チャット応募 (LIFF)** — 設計では「やらない」だが実装済み。ユーザー判断で**削除せず、設計を「採用」に変更**する方針。

### 確認した「やらない」のうち、既存実装なしの項目

以下は既に実装されていないため、追加クリーンアップ不要：
1.4 Apple Login / 1.5 SMS / 2.5 動画 / 3.5 ダイジェスト / 4.5 チャット /
8.3 取込スキップ詳細 / 8.5 直接掲載誘導 / 10.7 SMS 通知 /
11.3 シフト絞り込み / 11.9 AI 自然語検索 / 13.6 A/B テスト /
14.2 ATS 連携 / 14.3 Slack/Chatwork / 15.1 サブスク / 15.2 プラン管理 /
15.4 請求書発行 (Stripe Invoicing は 15.3 で使うため残す) /
15.5 リファラル / 16.4 多言語 / 17.5 名刺 OCR

### 解消した矛盾（最終確定方針）

| 矛盾 | 確定 |
|---|---|
| A: プッシュ通知（3.3 vs 16.2） | **採用**（16.2 を優先、3.3 は通知設定 UI 上のチャネル選択に統合） |
| B: LINE 公式（10.6 vs 14.6） | **10.6 採用、14.6 は LIFF として実装済みのため採用に変更**（設計修正済み or 修正予定） |
| C: スカウト（3.1 vs 12.4） | **持たない**（3.1 もスカウト関連メールは「やらない」に修正） |

---

## 次にやること（リード方針）

### Step 2: 設計と実装の整合性修正
- feature-decisions.md と architecture_genbacareer.md を編集
- 11.10 と 14.6 を「採用（実装済み）」に変更
- 3.1 のスカウト関連通知を「やらない」に統一

### Step 3: ブランディング監査（完了 2026-05-20）

**結果**:
- ✅ 旧ブランド (xwork 等) は **src/ 内に存在しない**
- ✅ ゲンバキャリア / genbacareer は src/ 内に **133 箇所** で適用済み
- ✅ `let-kyujin` の参照は内部識別子 2 箇所のみ（middleware の vercel.app URL コメント、jobs-api クライアントの User-Agent）→ 無害
- ⚠️ **業界カテゴリは建設業 + ドライバー特化** (`src/lib/categories.ts` の 9 カテゴリ)。設計の「ノンデスク 9 業界」とギャップあり
- ✅ 設計を **段階的拡大（Phase 1: 建設+ドライバー / Phase 2 以降: 介護・製造・飲食・小売・清掃・警備・農林水産）** に修正済み

### Step 4: Phase 1 未実装機能の洗い出し（完了 2026-05-20）

Phase 1 MVP リスト 32 機能のうち **約 85% (27/32) は既に実装済み**。
未実装または部分実装は以下 5 件のみ：

#### 高優先度（UX 直結）
1. **2.6 転職ステータス UI** ⚠️ 部分 — `User.status` は管理用 (active/suspended/deleted)。求職ステータス (求職中/在職中/採用済み) 用のフィールドと UI が未整備
2. **16.6 テーマ切り替え（ダーク/ライト）** ❌ 完全未実装
3. **16.1 PWA 対応** ⚠️ 部分 — Service Worker / Web App Manifest 未整備

#### 中優先度
4. **6.2 通報機能 UI** ⚠️ 部分 — `Report` model はあるが admin UI 未整備
5. **16.3 アクセシビリティ（WCAG 準拠）** ⚠️ 部分 — aria 属性は一部使用、監査・補強必要

### Step 5: 小さい単位で実装着手

| # | 機能 | 状態 | コミット |
|---|---|---|---|
| 5-A | 2.6 転職ステータス UI | ✅ 完了 | `f7a66af` |
| 5-B | 16.6 テーマ切り替え | ✅ 完了 | `f0a0eac` |
| 5-D | 16.1 PWA | ✅ 完了済み（manifest.ts で達成） | 既存 |
| 5-C | 6.2 通報機能 | ⏭ **Phase 2 に降格**（Report model から新規、UI も含めると Phase 1 越え） | - |
| 5-E | 16.3 a11y 監査・補強 | ⏭ **継続タスク**（コンポーネント追加時に都度 dark/a11y 対応） | - |

### Phase 1 MVP 達成状況

- ✅ Phase 1 必須機能 32 件中 **30 件完了**（2.6 と 16.6 を今セッションで追加実装）
- ⏭ 6.2 通報機能と 16.3 a11y は Phase 2 ／ 継続タスクへ
- → **Phase 1 は実質完了**、Phase 2 へ進める状態

---

## Phase 2 進捗（着手中）

### Phase 2-A: データ層拡張 ✅ 完了 (`0d9c0ca`)
新規 6 モデルを Prisma + ensure-schema に追加:
- ✅ Report (6.2 通報・レポート)
- ✅ JobCategoryClassification (7.1 タグ付け)
- ✅ CrawlerSyncCheckpoint (7.2 差分同期)
- ✅ SearchConsoleSnapshot (9.6 検索データ可視化)
- ✅ AiGeneratedArticle (9.7 AI コンテンツ生成)
- ✅ AnalyticsEvent (13.4 独自イベントトラッキング)

### Phase 2-B: 集客系機能（一部完了）
- ⏳ 12.1 企業ページの強化
- ✅ 12.5 企業フォロー UI（既存実装で十分）
- ✅ 12.6 企業ランキング (業界別 / 地域別) (`36d199f`)
- ⏳ 13.1 ブログ・お役立ち記事（Article model 既存、UI は別途）
- ✅ 13.2 地域 × 職種 LP（**既存** `/[prefecture]/[category]` で達成済み、追加実装した `/jobs/lp` は重複のため revert `a852bcb`）

### Phase 2-C: 通知 / Push
- ⏳ 3.3 + 16.2 Web Push 通知（Service Worker 含む）
- ⏳ 3.4 通知頻度・時間帯設定 UI

### Phase 2-D: 検索拡張
- ⏳ 11.2 マップ検索（Google Maps）
- ⏳ 11.5 縦スワイプ求人フィード（TikTok 風）
- ⏳ 11.6 / 11.7 レコメンド強化

### Phase 2-E: 運営強化
- ✅ 6.2 通報機能（Report model + 通報 UI + admin 解決画面）(`563e5d2`)
- ⏳ 6.4 BAN 機能 UI 強化

### Phase 2-F: アナリティクス
- ✅ 13.4 独自イベントトラッキング基盤 (`bac8b9f`)
  - `src/lib/track.ts` (trackEvent / getEventCounts)
  - admin /analytics に「独自イベント」セクション追加
  - 埋め込み済: /api/reports, /api/users/me/company-follows
  - 未埋め込み: view_job / search / apply_start / favorite_* など → 各所追加 TODO
- ⏳ 13.5 求人成果レポート（企業向け）
- ⏳ 9.6 Search Console 連携バッチ

### Phase 2-G: クローラ系
- ⏳ 7.1 タグ付け・カテゴリ分類（model 既存）
- ⏳ 7.2 差分同期・自動更新（model 既存）

### Phase 2-H: AI コンテンツ
- ⏳ 9.7 AI コンテンツ生成（model 既存）

---

## 既存リポジトリの実装済み資産（再利用可能）

- ✅ 認証基盤（NextAuth.js v5、メール+パスワード、Google OAuth、LINE Login）
- ✅ Prisma スキーマ（User, Company, Job, Application, CompanyFollow, JobFavorite, SavedSearch, BillingEvent, LineLead, Notification 等）
- ✅ 求人 CRUD（一覧・検索・詳細・応募）
- ✅ HelloWork クローラ（`scripts/run-hellowork-import.ts`, ensure-schema）
- ✅ 企業ダッシュボード（求人作成・編集・複製・パフォーマンス画面）
- ✅ 応募者管理（一覧・ステータス変更・一括変更）
- ✅ 運営 admin（求人精査・統計・通報対応・システム状態）
- ✅ ランキング（rank-score 算出、低品質求人下位表示）
- ✅ ブランディング部分対応（favicon, OG, Organization JSON-LD - 992c2d3）
- ✅ SEO（sitemap GSC、canonical 集約 - #128）
- ✅ メール送信（Xserver SMTP + Nodemailer - #114）
- ✅ プライバシー（規約、個人情報エクスポート - #117, #113）
- ✅ セキュリティ（rate-limit、ヘッダ、honeypot、Open Redirect 防御 - #110, #112）
- ✅ LINE 連携（LIFF、公式アカウント、Webhook 署名検証 - #120）
- ✅ PageSpeed Mobile 改善（bundle analyzer - #124, #125, #126）
- ✅ 企業ログイン情報発行（admin が企業に発行 - #122）
- ✅ 検索ログ可視化（C3 - #138）

---

## コミット履歴（このブランチで追加した分）

```
bac8b9f feat(track): 13.4 独自イベントトラッキング基盤
a852bcb revert(seo): 重複した /jobs/lp/[slug] LP を削除
33baa97 feat(seo): 13.2 地域 × 職種 LP 自動生成 (後に revert)
36d199f feat(companies): 12.6 企業ランキング (業界別 / 地域別)
563e5d2 feat(reports): 6.2 通報・レポート機能 を実装
0d9c0ca feat(schema): Phase 2-A データ層拡張 — 新規 6 モデル追加
f7337e1 docs(progress): Phase 1 実質完了宣言 + Phase 2 着手プラン
f0a0eac feat(theme): 16.6 ダーク / ライト テーマ切り替え
f7a66af feat(profile): 2.6 求職ステータス機能を追加
2c22e4d docs(progress): Phase 1 監査結果 — 27/32 実装済み、未着手 5 件のみ
ea87666 docs: ブランディング監査結果反映 — 業界カテゴリを段階的拡大方針に修正
92f353c docs: 設計と実装の整合性修正 — 矛盾 3 件を全て解消
573d488 docs: 進捗ノート (PROGRESS_GENBACAREER.md) 追加 — セッション間引き継ぎ用
81158f9 feat(cleanup): スカウト機能を完全削除 (12.4 やらない方針)
8c4652b docs: 残課題 11 項目の名称確定 + データモデル追加
defcbf9 docs: ゲンバキャリア 機能決定一覧 + アーキテクチャ設計
```

---

## 再開手順

このセッションが切れて新セッションで続きを再開する場合：

1. `git checkout claude/pending-content-G2KNe`
2. `git pull origin claude/pending-content-G2KNe`
3. このファイル (`docs/PROGRESS_GENBACAREER.md`) を読む
4. `docs/feature-decisions.md` で機能決定を確認
5. `docs/architecture_genbacareer.md` で設計方針を確認
6. 「次にやること」セクションの未完了タスクから着手
