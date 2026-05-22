# リリース直前 動作確認チェックリスト

> 本番デプロイ前 / デプロイ直後に、上から順に実行してください。
> 失敗した項目は対応 PR を作成 → 修正 → 再デプロイ → 再実行。

---

## 0. 事前準備

- [ ] `RELEASE_TODO.md` の手作業項目（Vercel env vars / Cron / GSC 等）が完了済み
- [ ] 本番 DB に schema が最新（起動時の `ensureSchema` で自動同期される）
- [ ] 直近の commit が main にマージ済み

---

## 1. ローカル統合チェック（5 分）

```bash
pnpm preflight
```

含まれる項目:
- typecheck (`tsc --noEmit`)
- lint (`eslint`)
- 単体テスト (`vitest run`)
- 環境変数チェック (`check-env`)
- 本番ビルド (`next build`)

致命的失敗があったら **本番デプロイしない**。修正後再実行。

---

## 2. 環境変数の最終確認（3 分）

```bash
pnpm check:env --env=production
```

`error` が 0 件 / `warning` のみであることを確認。

- error 0 / warning <= 数件 → ✅ OK
- error >= 1 → Vercel Dashboard に該当値を追加してから再実行

---

## 3. 本番デプロイ後の smoke test（5 分）

Vercel が `main` ブランチをデプロイし終わったら:

```bash
pnpm smoke   # 既定: https://genbacareer.jp に対して実行
```

含まれる項目:
- `/`、`/jobs`、`/robots.txt`、`/sitemap.xml`、`/api/health` の HTTP 200
- HSTS / X-Frame-Options / CSP / X-Robots-Tag の付与
- `robots.txt` に GPTBot / ClaudeBot Disallow があるか
- `curl` / `python-requests` UA で 403 が返るか（スクレイピング遮断）
- Mozilla UA は通過するか
- 構造化データ (Organization / WebSite) の出力

`🎉 全項目クリア` で 1 件も `❌` 無し → ✅ OK

---

## 4. ヘルスチェック（1 分）

```bash
curl https://genbacareer.jp/api/health?full=1 | jq
```

期待値:
- `status: "ok"`
- `checks.database.ok: true`
- `checks.env_required.ok: true`
- `deploy.commit` が最新 SHA に一致

---

## 5. 構造化データ検証（5 分）

Google [リッチリザルトテスト](https://search.google.com/test/rich-results):

- [ ] `https://genbacareer.jp/` → **Organization / WebSite** が検出
- [ ] `https://genbacareer.jp/jobs/<active-job-id>` → **JobPosting** が検出
  - title / description / hiringOrganization / jobLocation / datePosted / validThrough が出る
  - エラー 0 / 警告 0 が理想（warning がある場合は判断）

---

## 6. Sentry 接続テスト（2 分）

1. 管理者でログイン
2. `https://genbacareer.jp/api/admin/sentry-test` にアクセス
3. レスポンス JSON で `ok: true` 確認
4. Sentry Dashboard を開いて **1 分以内** にイベントが届いていることを確認

届かない場合:
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` が Vercel に設定されているか
- Sentry 側のプロジェクトキーが正しいか

---

## 7. Google Analytics 4 リアルタイム確認（3 分）

1. GA4 Dashboard → **レポート** → **リアルタイム**
2. 別タブで `https://genbacareer.jp/` を開く
3. **Cookie 同意バナーで「すべて受け入れる」をクリック**（GA4 はこれが条件）
4. 1〜2 分後にリアルタイムレポートに自分のアクセスが表示されることを確認

---

## 8. Playwright E2E スモークテスト（10 分）

初回のみ:
```bash
pnpm test:e2e:install   # Chromium バイナリ取得
```

実行:
```bash
PLAYWRIGHT_BASE_URL=https://genbacareer.jp pnpm test:e2e
```

含まれる項目:
- ホームページの Hero / 検索フォーム / クイックチップ
- 求人一覧 / 検索 0 件時の EmptyJobsState
- 404 ページの導線
- robots.txt / sitemap / X-Robots-Tag
- curl UA 403 / Mozilla UA 通過
- 構造化データ

すべて green → ✅ OK

---

## 9. Lighthouse 監査（15 分・実機推奨）

Chrome DevTools → **Lighthouse** タブで、以下の各 URL で実行:

- `/`（ホームページ）
- `/jobs`（求人一覧）
- `/jobs/<id>`（求人詳細）
- `/companies/<id>`（企業詳細）

ターゲット（Mobile / Mid-tier device）:

| 指標 | 目標 |
|---|---|
| Performance | **>= 80** |
| Accessibility | **>= 90** |
| Best Practices | **>= 90** |
| SEO | **>= 95** |
| LCP | < 2.5 s |
| CLS | < 0.1 |
| INP | < 200 ms |

80 未満になった指標があれば、Issue を作って改修を計画。

---

## 10. 実機モバイル動作確認（30 分）

iPhone / Android で以下のフローを通す:

### 求職者
- [ ] トップページが正しく表示される
- [ ] Hero 検索でキーワード入力 → 一覧に遷移
- [ ] 求人詳細から「LINE で応募」→ LIFF が開く（または `tel:` 起動）
- [ ] 新規登録 → 確認メール受信 → /verify-email クリック → ログイン完了
- [ ] お気に入り追加 → /mypage/favorites に出る
- [ ] 退会フロー（テストユーザーで）→ 完全に削除されることを確認

### 掲載企業
- [ ] /company/register → 仮登録メール受信
- [ ] admin 承認後 → ログイン可能
- [ ] /company/jobs/new → 求人投稿（差別表現の警告が出るか試す）
- [ ] /company/applications → 応募者一覧
- [ ] /company/gbizinfo → 法人番号入力（テスト用）→ 取り込まれるか

### 管理者
- [ ] /admin/status → 各種件数が表示
- [ ] /admin/companies → 承認待ち企業を承認
- [ ] /admin/articles → 新規記事投稿

---

## 11. メール送達確認（5 分）（メール本実装後）

- [ ] 求職者登録 → 確認メールが genbacareer@let-inc.net から届く
- [ ] パスワードリセット → リンクメール受信
- [ ] 応募完了 → 完了メール受信
- [ ] スカウト受信 → 通知メール受信
- [ ] 企業承認 → 企業へ承認完了メール
- [ ] 受信メールの **From / Reply-To / DKIM** が正しい

---

## 12. Stripe Invoicing 動作確認（5 分）（Stripe 本実装後）

- [ ] テスト企業に対して Application.status = "hired" に変更
- [ ] BillingEvent が `pending` で作成される
- [ ] admin が請求書発行 → Stripe Invoice 作成 → status = `invoiced`
- [ ] テストカードで支払い → status = `paid`
- [ ] Stripe Webhook（`invoice.payment_succeeded`）が届き DB 反映

---

## 13. Google Search Console（10 分）

- [ ] サイトマップ送信: `https://genbacareer.jp/sitemap.xml`
- [ ] URL 検査: `https://genbacareer.jp/jobs/<id>` → インデックス登録をリクエスト
- [ ] **拡張 → 求人情報** タブで JobPosting がインデックスされているか確認（数日後）

---

## ✅ 全部緑なら公式リリース可

各種 SNS / プレスリリース等を解禁する判断基準として活用してください。

何か気になる項目があれば、`/contact` または info@let-inc.net まで。
