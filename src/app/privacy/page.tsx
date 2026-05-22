import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  alternates: { canonical: "/privacy" },
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">プライバシーポリシー</h1>
      <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年5月13日</p>

      <div className="mt-8 space-y-8 text-gray-700 leading-relaxed">
        <p>
          株式会社LET（以下「当社」といいます）は、当社が運営する求人情報サービス「ゲンバキャリア」（以下「本サービス」といいます）における個人情報の取扱いについて、個人情報の保護に関する法律（個人情報保護法）その他の関連法令・ガイドラインを遵守し、以下のとおり定めます。
        </p>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            1. 取得する情報
          </h2>
          <p className="mt-2">本サービスでは以下の情報を取得します。</p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>氏名、メールアドレス、電話番号等の連絡先情報</li>
            <li>生年月日、性別、住所、希望勤務地等の属性情報</li>
            <li>職務経歴、保有資格、希望条件等の求職に関する情報</li>
            <li>履歴書 / 職務経歴書ファイル</li>
            <li>応募・スカウト・メッセージ等のサービス利用履歴</li>
            <li>
              アクセスログ、IPアドレス、ブラウザ情報、Cookie・端末識別子等の利用環境情報
            </li>
            <li>
              掲載企業の場合: 法人番号、代表者氏名、業種、所在地、許認可情報（GbizINFO API 経由で取得）
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">2. 利用目的</h2>
          <p className="mt-2">
            取得した個人情報は、以下の目的の範囲内で利用します。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>求人情報の提供および求職活動の支援（応募 / スカウト機能含む）</li>
            <li>応募情報の求人企業への提供</li>
            <li>本サービスの運営・改善・新機能開発・不正利用の検知</li>
            <li>有料職業紹介事業（許可番号 27-ユ-304693）の業務遂行</li>
            <li>お問い合わせ・サポート対応</li>
            <li>サービスに関するお知らせ・キャンペーン情報の送付</li>
            <li>統計データの作成（個人を特定できない形式）</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            3. 第三者提供
          </h2>
          <p className="mt-2">
            当社は、以下の場合を除き、利用者の同意なく個人情報を第三者に提供しません。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>利用者が求人に応募した場合の、当該求人企業への応募情報の提供</li>
            <li>法令に基づく場合</li>
            <li>人の生命・身体・財産の保護に必要で、本人同意の取得が困難な場合</li>
            <li>国の機関等への協力で同意取得が業務遂行に支障を及ぼす場合</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            4. 業務委託 / データ処理者
          </h2>
          <p className="mt-2">
            当社は、利用目的の達成に必要な範囲で個人情報の取扱いを以下の事業者に委託します。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>Supabase, Inc.</strong>（米国）— データベース / ストレージ
            </li>
            <li>
              <strong>Vercel, Inc.</strong>（米国）— アプリケーションホスティング
            </li>
            <li>
              <strong>Google LLC</strong>（米国）— アクセス解析 (GA4) / メール送信 (Workspace SMTP)
            </li>
            <li>
              <strong>Sentry (Functional Software, Inc.)</strong>（米国）— エラー監視
            </li>
            <li>
              <strong>マネーフォワード株式会社</strong>（日本）— 請求書発行・課金管理
            </li>
            <li>
              <strong>LINE Corporation</strong>（日本）— 応募者連絡 (Messaging API)
            </li>
          </ul>
          <p className="mt-2">
            委託先には個人情報保護に関する契約を締結し、適切な監督を行います。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            5. 越境移転
          </h2>
          <p className="mt-2">
            上記委託先の一部は米国に所在しており、利用者の個人情報は米国内のサーバーに保管される場合があります。米国の個人情報保護制度は{" "}
            <a
              href="https://www.ppc.go.jp/personalinfo/legal/kaiseihogohou/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 underline"
            >
              個人情報保護委員会の公表資料
            </a>{" "}
            をご参照ください。委託先各社とは標準契約条項 (SCC) 相当の契約を締結し、適切な保護を確保します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            6. 保管期間
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>会員情報: 退会後 30 日まで（バックアップを除く）</li>
            <li>応募情報: 退会後 1 年（職業安定法に基づく記録保存義務のため）</li>
            <li>アクセスログ / IP アドレス: 取得から 1 年</li>
            <li>課金関連書類: 7 年（法人税法・電子帳簿保存法に基づく）</li>
          </ul>
          <p className="mt-2">
            上記期間経過後は速やかに削除または匿名化処理を行います。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            7. Cookie の利用
          </h2>
          <p className="mt-2">
            本サービスでは、利用者の利便性向上およびサービス改善のために Cookie を使用します。Cookie はブラウザ設定で無効化可能ですが、一部の機能が正常に動作しなくなる場合があります。
          </p>
          <p className="mt-2">
            アクセス解析ツールとして Google Analytics 4 を利用しており、初回訪問時にバナーで Cookie 利用への同意を取得します。同意は{" "}
            <span className="font-bold">Cookie 設定</span> でいつでも撤回できます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            8. 安全管理措置
          </h2>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>通信経路の TLS 1.2 以上による暗号化</li>
            <li>パスワードの bcrypt ハッシュ保存</li>
            <li>2 段階認証（TOTP）の提供</li>
            <li>本人確認を経たアクセス権限管理</li>
            <li>従業員への個人情報取扱い教育</li>
            <li>不正アクセス検知 (Sentry 連携・rate-limit) </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            9. 開示・訂正・利用停止・データ可搬性
          </h2>
          <p className="mt-2">
            利用者は、自己の個人情報について個人情報保護法第 33 条以下に基づき、開示・訂正・追加・削除・利用停止・第三者提供停止を請求できます。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>
              <strong>データの一括ダウンロード</strong>: ログイン後{" "}
              <span className="font-mono text-sm">/mypage/settings</span> →「個人データのダウンロード」より JSON 形式で取得可能（個人情報保護法 第 33 条）
            </li>
            <li>
              <strong>削除請求</strong>:{" "}
              <span className="font-mono text-sm">/mypage/settings</span> →「退会する」から手続き可能。30 日以内にすべての個人データを削除します
            </li>
            <li>
              <strong>その他の請求</strong>: 本ポリシー末尾の問い合わせ先までご連絡ください。本人確認のうえ、合理的な範囲で速やかに対応します
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            10. 本ポリシーの変更
          </h2>
          <p className="mt-2">
            当社は法令の改正やサービス内容の変更に応じて本ポリシーを改定することがあります。重大な変更がある場合は、本サービス内通知または登録メールにて事前にお知らせします。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            11. お問い合わせ窓口
          </h2>
          <div className="mt-3 border border-gray-200 bg-gray-50 p-4 text-sm">
            <p className="font-bold">株式会社LET</p>
            <p className="mt-1">個人情報管理責任者: 取締役 吉川英治</p>
            <p className="mt-1">
              住所: 〒541-0058 大阪府大阪市中央区南久宝寺町4丁目4-12 IB CENTERビル8F
            </p>
            <p className="mt-1">電話: 06-6786-8320</p>
            <p className="mt-1">
              メール:{" "}
              <a
                href="mailto:info@let-inc.net"
                className="text-primary-600 underline"
              >
                info@let-inc.net
              </a>
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
