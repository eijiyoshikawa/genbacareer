import type { Metadata } from "next"
import {
  BookOpen,
  KeyRound,
  ShieldAlert,
  Rocket,
  Bug,
  Database,
  AlertTriangle,
} from "lucide-react"

export const metadata: Metadata = {
  title: "運用マニュアル | 管理画面",
}

export default function AdminManualPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6 text-red-600" />
          運用マニュアル
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          ゲンバキャリアの本番運用に必要な手順をまとめています。Vercel 環境変数の設定、管理者パスワード変更、デプロイ手順、トラブルシューティングなど。
        </p>
      </header>

      {/* セクション1：管理者パスワード変更 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <KeyRound className="h-5 w-5 text-red-600" />
          管理者パスワードを変更する
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          管理者ログイン用の PW は <code className="rounded bg-gray-100 px-1">ADMIN_PASSWORD_HASH</code> として
          Vercel に <strong>bcrypt ハッシュ</strong>で登録します。平文 PW は保存しません。
        </p>

        <ol className="mt-4 space-y-3 text-sm text-gray-700">
          <li>
            <strong>1. ターミナルで bcrypt ハッシュを生成</strong>
            <pre className="mt-2 overflow-x-auto bg-gray-900 p-3 text-xs text-gray-100">
{`cd ~/let_kyujin
node -e "console.log(require('bcryptjs').hashSync(process.argv[1], 10))" '新しいPW'`}
            </pre>
            <p className="mt-1 text-xs text-gray-500">
              出力された <code>$2b$10$...</code> で始まる 60 文字をコピー。
            </p>
          </li>

          <li>
            <strong>2. 照合スクリプトでハッシュと PW が合っているか確認</strong>
            <pre className="mt-2 overflow-x-auto bg-gray-900 p-3 text-xs text-gray-100">
{`node scripts/check-admin-password.cjs '新しいPW' '$2b$10$...'`}
            </pre>
            <p className="mt-1 text-xs text-gray-500">
              <code>OK: password matches hash</code> が出れば成功。
            </p>
          </li>

          <li>
            <strong>3. Vercel に貼り付け</strong>
            <ul className="ml-5 mt-1 list-disc text-xs text-gray-600">
              <li>Vercel → Settings → Environment Variables</li>
              <li>
                <code>ADMIN_PASSWORD_HASH</code> を Edit → 値を全削除して新ハッシュを貼り付け
              </li>
              <li>Production 環境にチェック → Save</li>
            </ul>
          </li>

          <li>
            <strong>4. Production を Redeploy</strong>
            <p className="mt-1 text-xs text-gray-500">
              Deployments → Production Current の <code>…</code> → Redeploy。Ready になったら新 PW でログイン。
            </p>
          </li>
        </ol>

        <div className="mt-4 border-l-4 border-yellow-400 bg-yellow-50 p-3 text-xs text-yellow-800">
          <strong>注意:</strong> PW（平文）は <strong>1Password / Apple
          のパスワード</strong>などに必ず保存してください。ハッシュからは復元できないため、忘れると今回と同じ手順をやり直すことになります。
        </div>
      </section>

      {/* セクション2：必須環境変数 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          必須の環境変数
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          いずれかが欠けると認証・DB アクセス・URL 生成などが動作しません。Vercel → Settings → Environment Variables で確認できます。
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">変数名</th>
                <th className="px-3 py-2">役割</th>
                <th className="px-3 py-2">注意</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              <tr>
                <td className="px-3 py-2 font-mono text-xs">ADMIN_EMAIL</td>
                <td className="px-3 py-2">管理者ログイン Email</td>
                <td className="px-3 py-2 text-xs text-gray-500">タイポ注意（複数形 S を付けない）</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-xs">ADMIN_PASSWORD_HASH</td>
                <td className="px-3 py-2">管理者 PW の bcrypt ハッシュ</td>
                <td className="px-3 py-2 text-xs text-gray-500">$2b$10$ で始まる 60 文字</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-xs">AUTH_SECRET</td>
                <td className="px-3 py-2">JWT 署名鍵</td>
                <td className="px-3 py-2 text-xs text-gray-500">未設定だとログイン直後に session が失われる</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-xs">NEXTAUTH_URL</td>
                <td className="px-3 py-2">サイトの正規 URL</td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  Domains の primary と一致（www の有無に注意）
                </td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-xs">DATABASE_URL</td>
                <td className="px-3 py-2">Supabase PostgreSQL 接続</td>
                <td className="px-3 py-2 text-xs text-gray-500">pgbouncer の Pooled 接続を使用</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-xs">NEXT_PUBLIC_BASE_URL</td>
                <td className="px-3 py-2">クライアント側で参照する公開 URL</td>
                <td className="px-3 py-2 text-xs text-gray-500">SITE_URL と一致させる</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* セクション3：AUTH_SECRET の生成 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <KeyRound className="h-5 w-5 text-red-600" />
          AUTH_SECRET を生成する
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          NextAuth が JWT を署名するためのランダム鍵。漏洩した場合は同じ手順で再生成し、Vercel で上書きしてください。
        </p>

        <pre className="mt-3 overflow-x-auto bg-gray-900 p-3 text-xs text-gray-100">
{`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`}
        </pre>
        <p className="mt-1 text-xs text-gray-500">
          出力された 44 文字を <code>AUTH_SECRET</code> として Vercel に登録（全環境チェック）→ Redeploy。
        </p>
      </section>

      {/* セクション4：デプロイ手順 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Rocket className="h-5 w-5 text-red-600" />
          デプロイ手順
        </h2>

        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            <strong>通常デプロイ:</strong>{" "}
            <code className="rounded bg-gray-100 px-1">main</code> ブランチへの PR マージで Preview ビルドが作成される。Vercel で <strong>Promote to Production</strong> すると本番反映。
          </li>
          <li>
            <strong>環境変数のみ変更時:</strong> Deployments → Production Current の <code>…</code> →
            <strong> Redeploy</strong>（Use existing Build Cache でも OK）
          </li>
          <li>
            <strong>緊急ロールバック:</strong> Deployments → 過去の Ready デプロイの <code>…</code> →
            <strong> Promote to Production</strong>
          </li>
        </ul>
      </section>

      {/* セクション5：トラブルシューティング */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Bug className="h-5 w-5 text-red-600" />
          トラブルシューティング
        </h2>

        <dl className="mt-3 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-gray-900">/admin/login でログインボタンを押しても /login に飛ぶ</dt>
            <dd className="mt-1 text-gray-600">
              ① <code>https://www.genbacareer.jp/api/auth/providers</code> を開き、<code>admin-credentials</code> が含まれているか確認。
              <br />
              無い場合は <code>ADMIN_EMAIL</code> または <code>ADMIN_PASSWORD_HASH</code> が未設定 or タイポ。
              <br />
              ② <code>AUTH_SECRET</code> が Production に設定されているか確認。
              <br />
              ③ ハッシュ照合スクリプトで PW とハッシュが一致するか確認。
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-900">ログイン後 / に飛ばされる（ダッシュボードに行かない）</dt>
            <dd className="mt-1 text-gray-600">
              JWT の role が admin になっていない。最新コードがデプロイされているか確認（signIn callback の修正が必要）。
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-900">大量の 504 / Prisma エラー</dt>
            <dd className="mt-1 text-gray-600">
              Supabase の Pooled 接続を使っているか、<code>connection_limit</code> パラメータが付いているか確認。
              スキャナーの大量プローブが原因の場合は Vercel Firewall で <code>/.env</code>, <code>/.ssh/*</code>, <code>/backend/*</code> をブロック。
            </dd>
          </div>

          <div>
            <dt className="font-semibold text-gray-900">レート制限がかかってログインできない</dt>
            <dd className="mt-1 text-gray-600">
              15 分間で 10 回失敗すると同一 IP からのログインが 15 分ブロックされます。時間を置いてから再試行。
            </dd>
          </div>
        </dl>
      </section>

      {/* セクション6：DB 操作 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Database className="h-5 w-5 text-red-600" />
          データベース操作
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            <strong>テーブル閲覧:</strong> Supabase Dashboard → Table Editor → 該当テーブル
          </li>
          <li>
            <strong>SQL 実行:</strong> Supabase Dashboard → SQL Editor で安全に実行可能
          </li>
          <li>
            <strong>スキーマ変更:</strong>{" "}
            <code className="rounded bg-gray-100 px-1">prisma/schema.prisma</code> を編集 →{" "}
            <code className="rounded bg-gray-100 px-1">pnpm prisma db push</code> または migration 作成
          </li>
        </ul>
      </section>

      <div className="border-l-4 border-red-400 bg-red-50 p-3 text-xs text-red-800">
        <p className="flex items-center gap-2 font-semibold">
          <AlertTriangle className="h-4 w-4" />
          重要
        </p>
        <ul className="ml-5 mt-1 list-disc">
          <li>本番 DB の直接 UPDATE / DELETE は必ず SQL Editor の確認後に実行</li>
          <li>環境変数を変更したら必ず Production を Redeploy する</li>
          <li>AUTH_SECRET と ADMIN_PASSWORD_HASH は絶対に Git にコミットしない</li>
        </ul>
      </div>
    </div>
  )
}
