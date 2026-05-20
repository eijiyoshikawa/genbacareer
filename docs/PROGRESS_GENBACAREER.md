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
上記の優先度順に実装。各機能ごとにコミット・プッシュ。

| # | 機能 | 状態 | コミット |
|---|---|---|---|
| 5-A | 2.6 転職ステータス UI | 未着手 | - |
| 5-B | 16.6 テーマ切り替え | 未着手 | - |
| 5-C | 6.2 通報機能 UI | 未着手 | - |
| 5-D | 16.1 PWA | 未着手 | - |
| 5-E | 16.3 a11y 監査・補強 | 未着手 | - |

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
