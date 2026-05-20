# ゲンバキャリア アーキテクチャ設計

ノンデスク産業特化型求人ポータル。建設・運送・介護・製造・飲食・小売・清掃など
「現場で働く人」のための転職プラットフォーム。

- **ブランド**: ゲンバキャリア（カタカナ表記固定）
- **ドメイン**: `genbacareer.jp`
- **基盤**: Next.js 15 (App Router) + TypeScript strict + Prisma v6 + PostgreSQL (Supabase) + NextAuth.js v5 + Zod v4 + Tailwind CSS v4

機能一覧の決定根拠は [feature-decisions.md](./feature-decisions.md) を参照。

---

## 1. プロダクトの位置づけ

| 軸 | 内容 |
|---|---|
| ターゲット業界 | 建設、運送・物流、介護、製造、飲食、小売、清掃、警備、農林水産 |
| ターゲットユーザー | スマホ中心のノンデスクワーカー（20〜50 代） |
| 差別化 | スワイプ UI + LINE 連携 + 採用決定ボーナス + 地域 × 職種 SEO |
| マネタイズ | **成果報酬型のみ**（採用成立時に手数料）。サブスクは持たない |
| 直接競合 | Indeed、エン転職、女の転職type、リクナビ NEXT、ジョブメドレー |

---

## 2. システム構成

```
┌────────────────────────────────────────────────────────┐
│ Edge: Vercel (Next.js 15 App Router, Server Components)│
│  - Public: 求人検索、企業ページ、LP、ブログ            │
│  - Authenticated: 求職者・企業・運営ダッシュボード     │
│  - PWA + Service Worker（プッシュ通知 16.2 / 3.3）     │
└────────────────────────────────────────────────────────┘
       │                          │                  │
       ▼                          ▼                  ▼
┌────────────────┐  ┌─────────────────────┐  ┌──────────────┐
│ Supabase       │  │ Xserver SMTP        │  │ 外部 API     │
│  - PostgreSQL  │  │  (Nodemailer 経由)  │  │  - Indeed    │
│  - Storage     │  │  メール配信 (10.1)  │  │  - LINE      │
│  - Auth (補助) │  │                     │  │  - Google    │
│                │  └─────────────────────┘  │    Maps      │
│  Prisma 6 ORM  │                           │  - Zoom/Meet │
└────────────────┘  ┌─────────────────────┐  │  - Google    │
                    │ LINE Messaging API  │  │    Calendar  │
                    │  (1.3 ログイン /    │  │  - GA4       │
                    │   3.2 通知 /        │  └──────────────┘
                    │   10.6 公式連携)    │
                    └─────────────────────┘
```

### 2.1 認証

- NextAuth.js v5 (beta)
- プロバイダ: Credentials（メール+パスワード 1.1）/ Google OAuth (1.2) / LINE Login (1.3)
- セッション: JWT（PostgreSQL に refresh token 保存）
- Apple ログイン (1.4) と SMS (1.5) は持たない

### 2.2 データモデル骨子（Prisma）

```prisma
model User {
  id              String   @id @default(cuid())
  email           String   @unique
  emailVerified   DateTime?
  role            UserRole // SEEKER | COMPANY | ADMIN
  // 求職者特有
  jobseeker       Jobseeker?
  // 企業特有
  companyMembers  CompanyMember[]
  accounts        Account[]
  sessions        Session[]
  // 17.4 データエクスポート / アカウント削除のため
  deletedAt       DateTime?
  exportedAt      DateTime?
}

model Jobseeker {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id])
  // 2.1 基本プロフィール
  displayName     String   // 17.2 ニックネーム可
  realName        String?  // 応募時のみ企業に開示
  birthYear       Int?
  prefCode        String?
  // 2.4 写真
  avatarUrl       String?
  // 2.6 転職ステータス
  status          JobseekerStatus // SEARCHING | EMPLOYED_OPEN | HIRED
  // 2.2 職務経歴書
  educations      Education[]
  experiences    WorkExperience[]
  certifications Certification[]
  skills         Skill[]
  // 2.3 希望条件
  preferences    JobPreference?
  // 17.3 ブロック企業
  blockedCompanies BlockedCompany[]
  // 12.5 企業フォロー
  followedCompanies CompanyFollow[]
  // 12.3 気になる
  jobInterests   JobInterest[]
  applications   Application[]
}

model Company {
  id              String   @id @default(cuid())
  name            String
  // 5.5 企業プロフィール
  logoUrl         String?
  description     String?
  industry        Industry // ノンデスク業界カテゴリ
  // 12.1 企業ページ
  slug            String   @unique
  // 12.6 ランキング
  rankScore       Float?
  // 14.1 Indeed 等への出稿
  externalSyncs   ExternalJobSync[]
  members         CompanyMember[]
  jobs            Job[]
  reviews         CompanyReview[]
  // 6.4 BAN
  bannedAt        DateTime?
}

model CompanyMember {
  // 5.6 企業チーム・複数ユーザー管理
  id        String   @id @default(cuid())
  companyId String
  userId    String
  role      CompanyRole // OWNER | ADMIN | RECRUITER
  @@unique([companyId, userId])
}

model Job {
  id              String   @id @default(cuid())
  companyId       String
  company         Company  @relation(fields: [companyId], references: [id])
  title           String
  description     String
  industry        Industry
  occupation      String   // 職種
  prefCode        String
  cityCode        String?
  latitude        Float?   // 11.2 マップ検索
  longitude       Float?
  salaryType      SalaryType // HOURLY | MONTHLY | ANNUAL
  salaryMin       Int?
  salaryMax       Int?
  // 11.4 待遇・福利厚生タグ
  benefits        Benefit[]
  // 5.3 ステータス
  status          JobStatus // DRAFT | PENDING_REVIEW | PUBLISHED | PAUSED | CLOSED
  publishedAt     DateTime?
  expiresAt       DateTime?
  // 6.1 運営精査
  reviewedBy      String?
  reviewedAt      DateTime?
  // 5.2 テンプレート
  templateOfId    String?
  // 5.4 画像
  images          JobImage[]
  // クローラ由来
  source          JobSource // OWN | HELLOWORK_HISTORICAL | INDEED_AGG
  externalId      String?
  // 8.4 重複マージ
  mergedIntoId    String?
  // ランクスコア
  rankScore       Float?
  applications    Application[]
  interests       JobInterest[]
  @@index([prefCode, occupation, status])
  @@index([rankScore(sort: Desc)])
}

model Application {
  // 4.1〜4.4 応募フロー
  id              String   @id @default(cuid())
  jobId           String
  jobseekerId     String
  status          ApplicationStatus // SUBMITTED | REVIEWING | INTERVIEW | OFFERED | HIRED | REJECTED | WITHDRAWN
  message         String?  // 4.2 応募時メッセージ
  appliedAt       DateTime @default(now())
  withdrawnAt     DateTime?
  // 15.3 成果報酬型課金
  hiredAt         DateTime?
  feeAmount       Int?     // 成功報酬額（採用成立時）
  feeInvoiceId    String?
  // 15.6 採用決定ボーナス
  seekerBonusAmount Int?
  // 14.4 面接日程
  interviews      Interview[]
}

model Interview {
  // 14.4 カレンダー連携 / 14.5 オンライン面接連携
  id            String   @id @default(cuid())
  applicationId String
  scheduledAt   DateTime
  type          InterviewType // ONSITE | ONLINE_ZOOM | ONLINE_MEET
  meetingUrl    String?
  // Google Calendar 連携用
  externalEventId String?
}

model CompanyReview {
  // 12.2 企業口コミ
  id          String   @id @default(cuid())
  companyId   String
  authorId    String
  rating      Int      // 1-5
  body        String
  status      ReviewStatus // PENDING | PUBLISHED | REMOVED
  // モデレーション
  reportedCount Int @default(0)
}

model ScrapedJob {
  // 7.x 8.x クローラ
  id            String   @id @default(cuid())
  source        String   // hellowork | indeed | ...
  externalId    String   @unique
  rawPayload    Json
  // 8.1 除外キーワードヒット
  excludedReasons String[]
  // 8.2 カテゴリ判定
  categoryGuess String?
  importedJobId String?
}

model EmailSuppression {
  // 10.4 オプトアウト
  email     String   @id
  reason    String   // user_unsubscribe | bounce | complaint
  createdAt DateTime @default(now())
}

model EmailTemplate {
  // 10.5 テンプレート管理
  id        String   @id @default(cuid())
  key       String   @unique // application_received など
  scope     String   // platform | company:{companyId}
  subject   String
  bodyHtml  String
  variables Json
}

model Report {
  // 6.2 通報
  id          String   @id @default(cuid())
  targetType  String   // job | company | user | review
  targetId    String
  reporterId  String
  reason      String
  status      ReportStatus // OPEN | RESOLVED | DISMISSED
}

model BlockedCompany {
  // 17.3 現職バレ防止
  jobseekerId String
  companyId   String
  @@id([jobseekerId, companyId])
}

model AnalyticsEvent {
  // 13.4 アナリティクス基盤
  id        String   @id @default(cuid())
  userId    String?
  sessionId String
  name      String   // search | view_job | apply | scout_click | ...
  payload   Json
  createdAt DateTime @default(now())
  @@index([name, createdAt])
}
```

### 2.3 主要 URL（公開ページ）

| URL | 用途 | キャッシュ戦略 |
|---|---|---|
| `/` | ホーム（業界別エントリ、人気求人） | ISR 24h |
| `/jobs` | 求人検索結果 | ISR 1h |
| `/jobs/[id]` | 求人詳細 | ISR 1h + on-demand revalidate |
| `/jobs/[pref]/[occupation]` | **13.2 地域×職種 LP**（自動生成） | SSG + ISR 24h |
| `/companies/[slug]` | 12.1 企業ページ | ISR 6h |
| `/companies/ranking` | 12.6 企業ランキング | ISR 24h |
| `/blog/[slug]` | 13.1 ブログ・お役立ち記事 | SSG |
| `/sitemap.xml` | 13.3 動的 sitemap | revalidate 6h |

### 2.4 主要 URL（認証必須）

| URL | 用途 |
|---|---|
| `/seeker/dashboard` | 求職者ダッシュボード |
| `/seeker/applications` | 4.3 応募履歴 |
| `/seeker/profile` | 2.x プロフィール編集 |
| `/seeker/swipe` | 11.5 / 16.5 縦スワイプ求人フィード |
| `/seeker/feed` | 11.6 / 11.7 パーソナライズフィード |
| `/seeker/settings/notifications` | 3.4 通知設定 |
| `/seeker/settings/blocked` | 17.3 ブロック企業 |
| `/seeker/settings/data` | 17.4 エクスポート・削除 |
| `/company/dashboard` | 企業ダッシュボード |
| `/company/jobs/new` | 5.1 求人作成 |
| `/company/jobs/[id]/duplicate` | 5.2 求人複製 |
| `/company/applicants` | 応募者一覧 |
| `/company/team` | 5.6 チーム管理 |
| `/company/report` | 13.5 求人成果レポート |
| `/admin` | 6.x 運営管理 |
| `/admin/jobs/review` | 6.1 求人精査 |
| `/admin/reports` | 6.2 通報対応 |
| `/admin/kpi` | 6.3 KPI ダッシュボード |
| `/admin/health` | 6.5 ヘルスチェック |

---

## 3. 矛盾点の最終確定方針（解消済み）

### 矛盾 A: プッシュ通知 → ✅ 採用

- 3.3 と 16.2 の重複。
- **16.2 を主体採用**（PWA 16.1 とセットで実装）。
- 3.x 通知設定 UI 上では「メール / LINE / プッシュ」の 3 チャネルから選べる。
- 3.4 通知頻度・時間帯設定もプッシュに適用。

### 矛盾 B: LINE 公式アカウント連携 → ✅ フル統合採用

- 10.6 と 14.6 の両方を採用。既に実装済み (`#120`, LIFF ミニフォーム + 公式アカウント連携)。
- LINE は **(a) Login (1.3)、(b) 通知配信 (3.2)、(c) リッチメニュー誘導 (10.6)、(d) LIFF 経由応募 (14.6)** の 4 つを統合提供。
- `scripts/setup-line-rich-menu.ts` を流用。

### 矛盾 C: スカウト機能 → ❌ 持たない（一貫）

- 12.4 スカウトメール ❌ を優先、3.1 メール通知も「やらない」に統一。
- **スカウト関連実装はコミット `81158f9` で全削除済み** (`Scout`/`ScoutTemplate` モデル、6 API、3 ページ、3 コンポーネント、関連 lib)。
- ノンデスク産業では**求職者主導の応募**と**気になる（12.3）→ 企業からの返し**で成立させる。
- 企業からの能動的アプローチは「気になる返し」のみ。

---

## 4. フェーズ計画

### Phase 1: MVP（最初に出す）

| 区分 | 機能 |
|---|---|
| 認証 | 1.1, 1.2, 1.3 |
| 求職者 | 2.1, 2.2, 2.3, 2.4, 2.6 |
| 応募 | 4.1, 4.2, 4.3, 4.4 |
| 企業 UX | 5.1, 5.2, 5.3, 5.4, 5.5 |
| 運営 | 6.1, 6.2, 6.5 |
| 検索 | 11.1, 11.4, 11.8 |
| 通知 | 10.1（SMTP 選定）, 10.3（Nodemailer 実装）, 10.4（オプトアウト）, 10.5（テンプレ管理） |
| SEO | 9.1（OG画像）, 9.2（JobPosting）, 9.3（sitemap）, 9.4（Organization）, 9.5（ISR）, 13.3 |
| 法令 | 17.1, 17.2, 17.4 |
| UX | 16.1（PWA）, 16.3（a11y）, 16.6（テーマ） |

### Phase 2: 集客拡大

| 区分 | 機能 |
|---|---|
| クローラ | 7.1（カテゴリ分類）, 7.2（差分同期）, 7.3（表記薄め）, 7.4（統計）, 7.5（競合分析）, 8.1, 8.2, 8.4 |
| 企業 | 12.1, 12.3, 12.5, 12.6 |
| SEO | 13.1, 13.2, 9.6（Search Console 連携）, 9.7（AI コンテンツ生成） |
| 検索 | 11.2, 11.5, 11.6, 11.7 |
| LINE | 3.2, 10.6 |
| 通知 | 3.3 (Push), 3.4, 16.2 |
| 運営 | 5.6, 6.3, 6.4 |
| 法令 | 17.3 |

### Phase 3: 差別化機能

| 区分 | 機能 |
|---|---|
| UX | 16.5（スワイプ）, 11.5（縦スワイプフィード） |
| 企業 | 12.2 口コミ |
| 分析 | 13.4 GA4 基盤, 13.5 求人成果レポート |
| 連携 | 14.1 Indeed 出稿, 14.4 カレンダー, 14.5 Zoom/Meet |

### Phase 4: マネタイズ

| 区分 | 機能 |
|---|---|
| 課金 | 15.3 成果報酬型課金（採用成立時手数料） |
| ボーナス | 15.6 採用決定ボーナス（求職者へ商品券） |

### 持たない（明示）

- 1.4 Apple ログイン
- 1.5 SMS 認証
- 2.5 動画自己紹介
- 3.5 ダイジェストメール
- 4.5 チャット
- 8.3 取込スキップ詳細ログ
- 8.5 直接掲載誘導メール
- 10.7 SMS 通知
- 11.3 シフト絞り込み（11.4 福利厚生タグで代替）
- 11.9 AI 自然語検索
- 12.4 スカウトメール（コミット 81158f9 で削除済み）
- 13.6 A/B テスト
- 14.2 ATS / 労務連携
- 14.3 Slack / Chatwork
- 15.1 Stripe サブスク
- 15.2 プラン管理
- 15.4 請求書発行
- 15.5 リファラル
- 16.4 多言語 i18n
- 17.5 名刺 OCR

---

## 5. 既存リポジトリとの関係

このリポジトリ（`let_kyujin`）には既に XWork クローン的な求人サイトが存在し、
HelloWork クローラ、ランキング、企業ログイン、admin など多くの機能が実装済み。

ゲンバキャリアはこれを**ベースに段階的にリブランド・拡張**する：

1. **ブランディング**: `ゲンバキャリア` 表記とロゴへ統一（一部 992c2d3 で着手済み）
2. **業界分類**: 既存の categoy/occupation を **ノンデスク 9 業界** に再編
3. **既存資産の活用**:
   - HelloWork クローラ → 7.x / 8.x の基盤
   - admin 求人精査 → 6.1
   - 企業ログイン情報発行 (#122) → 5.5 / 5.6
   - LINE 連携 (#120) → 1.3 / 3.2 / 10.6
   - プライバシー (#117) / 個人情報エクスポート (#113) → 17.1 / 17.4
   - SEO sitemap (#128) → 13.3
4. **新規追加**: スワイプ UI、地域×職種 LP、成果報酬課金、採用決定ボーナス、企業口コミ、PWA

---

## 6. 残課題の確定内容（旧 "名称不明" 11 項目）

ユーザーへの再確認で全 11 項目が確定。詳細は [feature-decisions.md](./feature-decisions.md) 参照。

### 7.x 公共求人 / 管理系（クローラ周辺）

- **7.1 タグ付け・カテゴリ分類** — クロール求人を `Job.industry / occupation` に自動分類
- **7.2 差分同期・自動更新** — 取り込み済み求人の変更検出と再取り込み
- **7.3 HelloWork 表記の薄め化・リブランド** — `Job.source = HELLOWORK_HISTORICAL` の UI 表記を自社風に
- **7.4 HelloWork 取り込み統計ダッシュボード** — admin で取り込み件数・エラー数・重複件数を可視化

### 9.x SEO 系

- **9.3 sitemap.xml 動的生成** — `/sitemap.xml` を 6h ISR で生成
- **9.4 Organization 構造化データ** — `<head>` に JSON-LD `Organization`（会社名・ロゴ・サポート）を埋め込み
- **9.5 ISR / ストリーミングレンダリング** — 求人・企業ページに Suspense + ISR
- **9.6 Search Console 連携・検索データ可視化** — GSC API で検索クエリ・CTR を admin で表示
- **9.7 AI コンテンツ生成（検索用記事）** — 13.1 ブログ・13.2 LP の本文をテンプレ + LLM 補完で生成

### 10.x 通知 / メール系

- **10.2 SaaS メール送信サービス（Resend 等）** ❌ — 10.1 で Xserver SMTP に決定済みのため不採用
- **10.3 Nodemailer + SMTP 送信実装** ✅ — `lib/email/sender.ts` 相当（PR #114 で実装済み）

---

## 7. データモデル追加分（残課題確定により追加）

```prisma
model JobCategoryClassification {
  // 7.1 タグ付け・カテゴリ分類
  scrapedJobId String   @id
  industry     Industry
  occupation   String
  confidence   Float    // 0.0-1.0
  classifiedBy ClassifierType // RULE | LLM | MANUAL
  classifiedAt DateTime @default(now())
}

model CrawlerSyncCheckpoint {
  // 7.2 差分同期
  source         String   @id // hellowork
  lastSyncedAt   DateTime
  lastCursor     String?
  totalImported  Int
  totalUpdated   Int
  totalSkipped   Int
}

model SearchConsoleSnapshot {
  // 9.6 Search Console 連携
  id          String   @id @default(cuid())
  date        DateTime
  query       String
  page        String
  clicks      Int
  impressions Int
  ctr         Float
  position    Float
  @@unique([date, query, page])
}

model AiGeneratedArticle {
  // 9.7 AI コンテンツ生成
  id           String   @id @default(cuid())
  slug         String   @unique
  topic        String   // 業界 + 職種 + 地域 等
  prompt       String
  bodyMarkdown String
  status       ArticleStatus // DRAFT | REVIEW | PUBLISHED
  publishedAt  DateTime?
  // 内部リンク用
  relatedJobIds String[]
}
```
