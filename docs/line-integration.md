# LINE 公式アカウント連携 セットアップ手順

ゲンバキャリアの LINE 連携には 3 つのチャネルが必要:

| # | チャネル種別 | 用途 |
|---|---|---|
| 1 | **LINE Login** | LINE アカウントでのソーシャルログイン (`/login` の「LINE で登録」) |
| 2 | **Messaging API** | 公式アカウントからの push 通知 + webhook 受信 |
| 3 | **LIFF** (LINE Login チャネル内) | 求人詳細ページ内の「LINE で 1 タップ応募」ミニアプリ |

実装側 (コード / DB モデル / webhook ルート / 署名検証 / Rich Menu スクリプト) は既に完成済み。本ドキュメントは **LINE Developers Console での設定 + Vercel 環境変数の登録** をカバーする。

---

## 0. 事前準備

- LINE ビジネス ID (https://account.line.biz/) を作成 (法人 = LET)
- 公式アカウント (例: `@genbacareer`) を作成

---

## 1. LINE Developers Console でプロバイダー作成

1. https://developers.line.biz/console/ にログイン
2. **「プロバイダー」を作成** → 名前: `株式会社LET`
3. 以後すべてのチャネルはこのプロバイダーに紐付ける

---

## 2. LINE Login チャネル

### 2-1. チャネル作成
1. プロバイダー画面 → **新規チャネル作成** → **LINE Login**
2. 設定:
   - チャネル名: `ゲンバキャリア`
   - チャネル説明: `建設業特化型求人サイト`
   - アプリタイプ: ✅ **ウェブアプリ**
   - メールアドレス取得権限: ✅ 申請

### 2-2. コールバック URL
- LINE Login 設定タブ:
  - **コールバック URL** に以下を登録:
    ```
    https://www.genbacareer.jp/api/auth/callback/line
    http://localhost:3000/api/auth/callback/line
    ```

### 2-3. 取得する値
- 基本設定タブ:
  - **Channel ID** → `LINE_CLIENT_ID`
  - **Channel secret** → `LINE_CLIENT_SECRET`

---

## 3. Messaging API チャネル

### 3-1. チャネル作成
1. プロバイダー画面 → **新規チャネル作成** → **Messaging API**
2. 設定:
   - チャネル名: `ゲンバキャリア公式`
   - 大カテゴリ / 小カテゴリ: 適宜
   - 公式アカウントの基本 ID (`@genbacareer` 等) を紐付け

### 3-2. Webhook 設定
- Messaging API 設定タブ:
  - **Webhook URL** に登録:
    ```
    https://www.genbacareer.jp/api/line/webhook
    ```
  - **Webhook の利用**: ✅ オン
  - **Webhook の検証** ボタン → "成功" になるか確認 (Vercel 環境変数設定後)
  - **応答メッセージ**: ❌ オフ (webhook 側で制御)
  - **あいさつメッセージ**: ❌ オフ (webhook 側で送信)

### 3-3. 取得する値
- Messaging API 設定タブ:
  - **チャネルアクセストークン (長期)** → 発行 → コピー → `LINE_CHANNEL_ACCESS_TOKEN`
- 基本設定タブ:
  - **チャネルシークレット** → `LINE_CHANNEL_SECRET`

### 3-4. その他の必須設定
- 基本設定タブ:
  - **AI メッセージ応答 (旧 LINE Bot)**: ❌ オフ
- 公式アカウント (LINE Official Account Manager) 側:
  - https://manager.line.biz/ にログイン
  - 設定 → 応答設定:
    - **応答モード**: ✅ **Bot**
    - **チャット**: ❌ オフ (webhook で扱うため)
    - **あいさつメッセージ**: ❌ オフ
    - **応答メッセージ**: ❌ オフ
    - **Webhook**: ✅ オン

---

## 4. LIFF (LINE 内ブラウザ用ミニアプリ)

LIFF は **LINE Login チャネル内に追加** する (新規チャネルではない)。

1. LINE Login チャネル → **LIFF タブ** → **追加**
2. 設定:
   - LIFF アプリ名: `ゲンバキャリア応募フォーム`
   - サイズ: **Full**
   - エンドポイント URL: `https://www.genbacareer.jp/liff/apply`
   - Scope: ✅ `profile` / ✅ `openid`
   - ボットリンク機能: **On (Aggressive)** (応募 = 友だち追加同時実行)
   - Scan QR: ✅ オン (任意)
3. 作成完了画面に表示される:
   - **LIFF ID** (例: `1234567890-AbCdEfGh`) → `NEXT_PUBLIC_LIFF_ID`
   - **LIFF URL** (`https://liff.line.me/{LIFF_ID}`) → 求人 LP の応募ボタン URL に使う
4. LIFF を提供する LINE Login チャネルの **Channel ID** → `LIFF_CHANNEL_ID` / `NEXT_PUBLIC_LIFF_CHANNEL_ID` (access token 検証用、`LINE_CLIENT_ID` と同じ値で OK)

---

## 5. Vercel 環境変数に登録

Vercel Dashboard → `let_kyujin` → **Settings → Environment Variables**:

| Key | Value | スコープ |
|---|---|---|
| `LINE_CLIENT_ID` | (LINE Login Channel ID) | Production / Preview / Development |
| `LINE_CLIENT_SECRET` | (LINE Login Channel secret) | 同上 |
| `LINE_OA_ID` | `@genbacareer` 等 | 同上 |
| `NEXT_PUBLIC_LINE_OA_ID` | `@genbacareer` 等 (同じ値) | 同上 |
| `LINE_CHANNEL_ACCESS_TOKEN` | (Messaging API 長期 token) | 同上 |
| `LINE_CHANNEL_SECRET` | (Messaging API channel secret) | 同上 |
| `NEXT_PUBLIC_LIFF_ID` | (LIFF アプリ ID) | 同上 |
| `LIFF_CHANNEL_ID` | (= LINE_CLIENT_ID) | 同上 |
| `NEXT_PUBLIC_LIFF_CHANNEL_ID` | (= LINE_CLIENT_ID) | 同上 |

設定完了後 → **Deployments → Redeploy** (Build Cache off)。

---

## 6. リッチメニュー登録

ローカルで実行:

```bash
# 画像準備 (2500×1686px, PNG, 1MB 以内)
# 画像の置き場所:
cp <your-rich-menu.png> scripts/rich-menu.png

# .env.local に LINE_CHANNEL_ACCESS_TOKEN をセット (Vercel と同じ値)
echo 'LINE_CHANNEL_ACCESS_TOKEN="..."' >> .env.local

# スクリプト実行
pnpm tsx scripts/setup-line-rich-menu.ts
```

実行内容:
- 既存リッチメニューを削除
- 新リッチメニュー作成 (6 ボタン: 求人を探す / マガジン / 料金 / 運営会社 / お問い合わせ / 公式 SNS)
- 画像アップロード
- デフォルトリッチメニューに設定

---

## 7. 動作確認

1. **LINE Login**: ゲンバキャリアの `/login` 画面 → 「LINE で登録」をタップ → LINE 認証 → サイトに戻ってログイン完了
2. **LIFF 応募**: 求人詳細ページの「LINE で 1 タップ応募」ボタン → LIFF が開く → プロフィール自動入力 → 送信
3. **Webhook**: 公式アカウントを友だち追加 → あいさつメッセージが届く (webhook 経由)
4. **メッセージ**: 公式アカウントに「電話番号 09012345678」と送る → `LineLead` テーブルに自動紐付け
5. **Push 通知**: admin → `/admin/line-leads/[id]` → 「メッセージ送信」テスト
6. **リッチメニュー**: 公式アカウントを開いて画面下に 6 ボタンメニューが表示される

---

## 8. トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| Webhook 検証ボタンが失敗する | `LINE_CHANNEL_SECRET` 未設定 / 不一致 | Vercel env を再確認 + redeploy |
| 友だち追加してもあいさつメッセージが来ない | 公式アカウント側で「あいさつメッセージ」がオンになっている (webhook と重複防止のため公式側はオフ必須) | LINE Official Account Manager → 応答設定 |
| `/login` の LINE ボタンを押すと invalid_client エラー | `LINE_CLIENT_ID` / `LINE_CLIENT_SECRET` が間違っている、またはコールバック URL 未登録 | LINE Developers Console → LINE Login 設定 |
| LIFF が開かない (white screen) | `NEXT_PUBLIC_LIFF_ID` 未設定 / 公開ビルドに含まれていない | env 設定後 redeploy が必要 |
| Push 通知 API が `line_not_configured` を返す | `LINE_CHANNEL_ACCESS_TOKEN` 未設定 | 上記 5 章を確認 |

---

## 9. 関連ファイル

- `src/lib/line-messaging.ts` — Messaging API client + 署名検証
- `src/lib/liff.ts` — LIFF access token 検証
- `src/app/api/line/webhook/route.ts` — webhook ハンドラ
- `src/app/liff/apply/[id]/page.tsx` — LIFF 応募ページ
- `src/app/api/applications/liff-lead/route.ts` — LIFF 経由応募エンドポイント
- `scripts/setup-line-rich-menu.ts` — リッチメニュー登録スクリプト
- `prisma/schema.prisma` の `LineLead` モデル
