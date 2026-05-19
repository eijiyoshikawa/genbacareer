import type { Metadata } from "next"
import Link from "next/link"
import {
  BookOpen,
  Briefcase,
  Users,
  CreditCard,
  Shield,
  Send,
  Settings,
  HelpCircle,
} from "lucide-react"

export const metadata: Metadata = {
  title: "使い方ガイド | 企業管理画面",
}

export default function CompanyHelpPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <BookOpen className="h-6 w-6 text-primary-600" />
          使い方ガイド
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          ゲンバキャリアの企業管理画面の機能と使い方をまとめています。困ったときはこのページを参照してください。
        </p>
      </header>

      {/* 求人管理 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Briefcase className="h-5 w-5 text-primary-600" />
          求人を掲載する
        </h2>
        <ol className="mt-3 space-y-2 text-sm text-gray-700">
          <li>1. 左メニュー <Link href="/company/jobs" className="text-primary-600 underline">求人管理</Link> を開く</li>
          <li>2. 右上の <strong>「新規作成」</strong> ボタンをクリック</li>
          <li>3. 職種・勤務地・給与・募集要項などを入力</li>
          <li>4. <strong>「下書き保存」</strong> で一時保存 / <strong>「公開」</strong> で即時掲載</li>
          <li>5. 掲載中の求人は一覧画面で編集・停止・複製が可能</li>
        </ol>
        <div className="mt-3 border-l-4 border-blue-400 bg-blue-50 p-3 text-xs text-blue-800">
          <strong>ヒント:</strong> 求人テンプレートを使うと、似た求人を素早く複製して作成できます。
        </div>
      </section>

      {/* 応募者管理 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Users className="h-5 w-5 text-primary-600" />
          応募者を管理する
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            <Link href="/company/applications" className="text-primary-600 underline">応募者管理</Link> から、応募一覧・選考ステータス変更・メッセージ送信が可能
          </li>
          <li>応募者のプロフィール（経歴・希望条件）を閲覧できます</li>
          <li>選考ステータスは「未対応 → 書類選考 → 面接 → 採用 / 不採用」の流れで遷移</li>
        </ul>
      </section>

      {/* スカウト */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Send className="h-5 w-5 text-primary-600" />
          スカウトを送る
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            <Link href="/company/scouts" className="text-primary-600 underline">スカウト</Link> から条件に合う求職者を検索
          </li>
          <li>1 通あたり 課金が発生します（料金は課金管理ページ参照）</li>
          <li>送信後の開封・返信状況はステータス画面でトラッキング可能</li>
        </ul>
      </section>

      {/* 課金 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <CreditCard className="h-5 w-5 text-primary-600" />
          課金と請求
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            <Link href="/company/billing" className="text-primary-600 underline">課金履歴</Link> で月次の利用状況・請求書を確認できます
          </li>
          <li>成果報酬: 採用確定時に料金発生</li>
          <li>スカウト送信: 1通単位で課金</li>
          <li>請求書は月末締め → 翌月初に発行</li>
        </ul>
      </section>

      {/* セキュリティ */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Shield className="h-5 w-5 text-primary-600" />
          セキュリティ設定
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            <Link href="/company/security" className="text-primary-600 underline">セキュリティ</Link> から二段階認証（TOTP）を有効化できます
          </li>
          <li>Google Authenticator や 1Password などの TOTP アプリで QR をスキャン</li>
          <li>リカバリコードは紛失時の唯一の救済手段なので必ず保管してください</li>
          <li>パスワード変更も同ページから可能</li>
        </ul>
      </section>

      {/* 企業情報 */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Settings className="h-5 w-5 text-primary-600" />
          企業プロフィール
        </h2>
        <ul className="mt-3 space-y-2 text-sm text-gray-700">
          <li>
            <Link href="/company/profile" className="text-primary-600 underline">企業情報・SNS</Link> から会社概要・SNS リンクを編集
          </li>
          <li>
            <Link href="/company/gbizinfo" className="text-primary-600 underline">法人番号・建設業許可</Link> で gBizINFO 連携や建設業許可情報を登録
          </li>
          <li>プロフィールが充実しているほど求職者からの応募率が上がります</li>
        </ul>
      </section>

      {/* FAQ */}
      <section className="border bg-white p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <HelpCircle className="h-5 w-5 text-primary-600" />
          よくある質問
        </h2>
        <dl className="mt-3 space-y-4 text-sm">
          <div>
            <dt className="font-semibold text-gray-900">Q. パスワードを忘れました</dt>
            <dd className="mt-1 text-gray-600">
              ログイン画面の <strong>「パスワードをお忘れの方」</strong> から再設定メールを送信できます。
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">Q. 担当者を追加できますか？</dt>
            <dd className="mt-1 text-gray-600">
              管理者権限のユーザーが招待リンクを発行することで、複数担当者の追加が可能です。詳しくはサポートまでお問い合わせください。
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">Q. 掲載を停止したい</dt>
            <dd className="mt-1 text-gray-600">
              求人管理から該当求人を <strong>「非公開」</strong> に変更すると即時に検索結果から除外されます（削除はされません）。
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-gray-900">Q. 不適切な応募があった</dt>
            <dd className="mt-1 text-gray-600">
              応募詳細画面の <strong>「通報」</strong> から運営に連絡できます。スパムや不適切な行為は当社で確認・対処します。
            </dd>
          </div>
        </dl>
      </section>

      <div className="border-l-4 border-primary-400 bg-primary-50 p-3 text-xs text-gray-700">
        <strong>サポート:</strong> 解決しない場合は{" "}
        <Link href="/contact" className="text-primary-600 underline">
          お問い合わせフォーム
        </Link>{" "}
        からご連絡ください。営業日 24 時間以内に返信いたします。
      </div>
    </div>
  )
}
