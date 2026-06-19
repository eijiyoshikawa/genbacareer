import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "個人情報適正管理規程",
  description:
    "株式会社LETが運営する求人情報サービス「ゲンバキャリア」における、職業安定法および職業紹介事業者等指針に基づく求職者等の個人情報の適正な管理に関する規程です。",
}

/**
 * 個人情報適正管理規程（職業安定法 第5条の5 / 職業紹介事業者等指針 に基づく）。
 * プライバシーポリシー(/privacy)とは別に、有料職業紹介事業者として求職者等の
 * 個人情報の取扱いを定める規程を公表するためのページ。
 * デザインは既存の法務ページ(/privacy, /terms)に合わせる。
 */
export default function PersonalInfoManagementPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">個人情報適正管理規程</h1>
      <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年6月16日</p>

      <div className="mt-8 space-y-8 text-gray-700 leading-relaxed">
        <section>
          <p>
            株式会社LET（以下「当社」といいます）は、当社が運営する求人情報サービス「ゲンバキャリア」（以下「本サービス」といいます）における有料職業紹介事業（許可番号 27-ユ-304693）に関し、職業安定法第5条の5および職業紹介事業者等が均等待遇、労働条件等の明示、求職者等の個人情報の取扱い等に関して適切に対処するための指針（平成11年労働省告示第141号）に基づき、求職者および求人者等（以下「求職者等」といいます）の個人情報を適正に管理するため、本規程を定めます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">1. 適用範囲</h2>
          <p className="mt-2">
            本規程は、当社が本サービスの提供および職業紹介業務に関連して取り扱う求職者等の個人情報のすべてに適用します。個人情報全般の取扱いについては別途定める
            <Link href="/privacy" className="text-primary-600 underline">プライバシーポリシー</Link>
            も併せて適用されます。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            2. 個人情報を取り扱う者の範囲
          </h2>
          <p className="mt-2">
            求職者等の個人情報を取り扱う者は、業務上必要な範囲に限定し、当社の役員および従業員（業務委託先を含む）のうち、職業紹介責任者の管理の下にある担当者に限ります。各担当者には、職務上知り得た個人情報の保持義務を課します。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            3. 取り扱う個人情報の範囲・収集の制限
          </h2>
          <p className="mt-2">
            当社は、業務の目的の達成に必要な範囲内で求職者等の個人情報を収集し、収集にあたっては適法かつ公正な手段によるものとします。
          </p>
          <p className="mt-2">
            また、次に掲げる個人情報については、特別な職業上の必要性が存在することその他業務の目的の達成に必要不可欠であって、収集目的を示して本人から収集する場合を除き、原則として収集しません。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>人種、民族、社会的身分、門地、本籍、出生地その他社会的差別の原因となるおそれのある事項</li>
            <li>思想および信条</li>
            <li>労働組合への加入状況</li>
            <li>信仰・宗教</li>
            <li>健康状態・病歴・身体的特徴等の医療に関する情報</li>
            <li>性的指向および性自認に関する情報</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            4. 利用目的・目的外利用の禁止
          </h2>
          <p className="mt-2">
            当社は、求職者等の個人情報を、職業紹介・求人情報の提供および求職者支援に係る業務の目的の達成に必要な範囲内で利用します。本人の同意がある場合または法令に基づく場合を除き、収集目的の範囲を超えて利用しません。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            5. 保管・安全管理措置
          </h2>
          <p className="mt-2">
            当社は、個人情報の紛失、破壊、改ざんおよび漏えい等を防止するため、以下を含む組織的・人的・物理的・技術的な安全管理措置を講じます。
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-6">
            <li>アクセス権限の管理および取扱担当者の限定</li>
            <li>従業員に対する個人情報の適正な取扱いに関する教育</li>
            <li>通信の暗号化（TLS）等による不正アクセス・漏えいの防止</li>
            <li>取扱状況の記録および定期的な点検</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">6. 委託先の管理</h2>
          <p className="mt-2">
            業務の一部を外部に委託する場合は、十分な個人情報の保護水準を有する者を選定し、委託契約において個人情報の適正な取扱いを義務付けるとともに、適切な監督を行います。委託先の詳細は
            <Link href="/privacy" className="text-primary-600 underline">プライバシーポリシー</Link>
            に記載のとおりです。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">7. 廃棄</h2>
          <p className="mt-2">
            個人情報を利用する必要がなくなったときは、遅滞なく当該個人情報を消去または廃棄します。求職の申込みの撤回や本人からの求めがあった場合も同様に、保有する必要がなくなった個人情報を消去します（法令に基づき保存が必要な場合を除く）。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            8. 本人からの開示・訂正・利用停止等
          </h2>
          <p className="mt-2">
            当社は、本人から自己の個人情報の開示、訂正、追加、削除、利用停止または第三者提供の停止の求めがあった場合、本人であることを確認のうえ、法令に従い遅滞なく対応します。会員の方はマイページからもご自身の個人データの確認・取得・退会が可能です。
          </p>
        </section>

        <section id="complaints">
          <h2 className="text-lg font-semibold text-gray-900">
            9. 苦情・相談窓口
          </h2>
          <p className="mt-2">
            本サービスの個人情報の取扱いおよび求人内容・職業紹介に関する苦情・相談は、下記の窓口で受け付けます。受付後、適切かつ迅速に対応します。
          </p>
          <div className="mt-3 border border-gray-200 bg-gray-50 p-4 text-sm">
            <p>株式会社LET　個人情報相談窓口</p>
            <p className="mt-1">個人情報適正管理の責任者: 取締役 吉川 英治</p>
            <p className="mt-1">
              所在地: 〒541-0058 大阪府大阪市中央区南久宝寺町4-4-12 IB CENTERビル8F
            </p>
            <p className="mt-1">電話: 06-6786-8320（平日 10:00〜19:00）</p>
            <p className="mt-1">
              お問い合わせフォーム:{" "}
              <Link href="/contact" className="text-primary-600 underline">/contact</Link>
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">
            10. 規程の周知・改定
          </h2>
          <p className="mt-2">
            本規程は、本ウェブサイト上での公表により求職者等および従業員に周知します。法令の改正や事業内容の変更等に応じ、本規程を改定することがあります。改定した場合は本ページにて公表します。
          </p>
        </section>

        <section>
          <p className="text-sm text-gray-500">
            制定: 株式会社LET（有料職業紹介事業 許可番号 27-ユ-304693）
          </p>
        </section>
      </div>
    </div>
  )
}
