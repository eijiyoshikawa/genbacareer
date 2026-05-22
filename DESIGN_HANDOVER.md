# デザインリニューアル 引き継ぎドキュメント

## ブランチ
`claude/update-website-design-Cu8LX` (12コミット、PRは未作成)

## 完了済みの作業

### Phase 1: カラーテーマ変更（全サイト）
- **blue系 → orange/primary系** に全34ファイルから完全移行（残存blue参照: 0件）
- カスタムカラーパレット: `primary-50`〜`primary-900` を `globals.css` の `@theme inline` に定義
- 背景色: `#fafafa`（ニュートラルグレー）
- CTAボタン: `bg-primary-600`（オレンジ）
- ダークセクション: `bg-stone-900`
- フォント: システムフォント統一（`-apple-system, Hiragino Kaku Gothic ProN, Noto Sans JP` 等）

### Phase 2: トップページレイアウト再構築（クロスワーク参考）
- **ヒーロー**: 建設現場の背景画像 + 黒オーバーレイ + 検索フォーム
- **ロゴスライダー**: ヒーロー直下に配置
- **カテゴリ**: 写真付き4×2カードグリッド（PC 3列、モバイル2列）※サイドバー考慮
- **エリア**: 都道府県ボタン12個のグリッド
- **マガジン + 転職体験談**: 2カラムカード（左: マガジン、右: 体験談）
- **サービス特徴**: 01/02/03の番号付き3項目
- **ニュース**: ボーダー区切りリスト
- **統計**: 掲載求人数表示
- **企業CTA**: ダーク背景
- **サイドバー（PC only, w-72, sticky）**: 人気求人ランキング / おすすめ記事 / 公式SNS / 会員登録CTA

### Phase 3: AI感払拭・品質改善
- 過剰な `rounded-xl` → `rounded-lg` に統一
- 過剰な `shadow-sm/md/2xl` 削減
- `group-hover:scale-105` → `brightness-110` に差別化
- カラーヘッダー（bg-primary-600等）→ シンプルな `border-b` ヘッダーに
- ヘッダーのグラデーションライン削除、`border-b` のみに
- CTAボタンの過剰な装飾（shadow-md, border-2, font-bold）を簡素化

### Phase 4: 公開前バグ・技術修正
- ✅ `error.tsx` 新規作成
- ✅ `href="#"` → 実SNS URL（仮）に全件置換（残存0件）
- ✅ `console.log` → `console.info` に変更（6ファイル）
- ✅ OG画像メタデータ追加（`layout.tsx` に `images` プロパティ追加）
- ✅ Organization構造化データ追加（`page.tsx` に JSON-LD）
- ✅ localhost fallback強化（`email.ts`）

---

## 未完了の作業（手動対応が必要）

### 必須（公開前）

| # | 内容 | 対象ファイル | 詳細 |
|---|------|-------------|------|
| 1 | **Unsplash画像を自社写真に差替** | `src/app/page.tsx` | 9箇所のUnsplash URLを自社撮影写真に変更。ヒーロー背景1枚 + カテゴリ8枚 |
| 2 | **SNS URLを実アカウントに変更** | `src/app/page.tsx`, `src/components/layout/footer.tsx` | 現在 `youtube.com/@let-kensetsu` 等の仮URL。実アカウントURLに変更 |
| 3 | **環境変数の設定** | `.env` | `NEXTAUTH_SECRET`(本番用), `DATABASE_URL`(Supabase), `NEXTAUTH_URL`(本番ドメイン), `NEXT_PUBLIC_SITE_URL` |
| 4 | **Google Analytics設定** | `.env` | `NEXT_PUBLIC_GA_ID=G-XXXXXX` を設定 |
| 5 | **ドメイン設定** | Vercel | 独自ドメインを設定し、layout.tsx の `siteUrl` 変数元の env も更新 |
| 6 | **OG画像の動作確認** | ブラウザ | `/opengraph-image` にアクセスして画像が正しく生成されるか確認 |
| 7 | **Organization構造化データのURL更新** | `src/app/page.tsx` 115行目付近 | `https://let-kyujin.vercel.app` を本番ドメインに変更 |

### 推奨（公開後でもOK）

| # | 内容 | 詳細 |
|---|------|------|
| 8 | ニュースをDB化 | `page.tsx` の `newsItems` 配列がハードコード。管理画面から更新できるようにする |
| 9 | favicon/アイコン整備 | `public/` にfavicon.ico, apple-touch-icon等を配置 |
| 10 | Googleサーチコンソール登録 | `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` を `.env` に設定 |
| 11 | LocalBusiness構造化データ追加 | 会社所在地の詳細なschemaを追加 |
| 12 | SendGrid設定 | メール送信を有効化（現在はconsole.logフォールバック） |
| 13 | Stripe本番設定 | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` の本番キー設定 |
| 14 | モバイル実機テスト | 各ページのレスポンシブ表示を実機で確認 |

---

## 技術スタック（変更なし）
- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS v4 (`@tailwindcss/postcss`)
- Prisma v6 + PostgreSQL (Supabase)
- NextAuth.js v5 (beta)
- Zod v4

## 主要コマンド
```bash
pnpm dev          # 開発サーバー
pnpm build        # ビルド検証
pnpm lint         # ESLint
pnpm prisma generate  # Prismaクライアント生成
pnpm prisma db push   # スキーマをDBに反映
```

## カラーパレット定義場所
`src/app/globals.css` の `@theme inline` ブロック内:
- `--color-primary-50` 〜 `--color-primary-900` (オレンジ系)
- `--color-warm-50` 〜 `--color-warm-200` (stone系ニュートラル)
- `--color-accent: #2563eb` (ブルー、補助色)
