import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "サイトについて",
}

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">サイトについて</h1>

      <div className="mt-8 space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-lg font-semibold text-gray-900">本サイトの目的</h2>
          <p className="mt-2">
            本サイト「ゲンバキャリア」は、建設業界に特化した求人サイトです。
            建築・土木・設備・解体・重機オペレーターなど、建設現場で活躍する方々が、
            より自分に合った仕事を見つけやすくすることを目的としています。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">掲載求人について</h2>
          <p className="mt-2">
            本サイトでは、建設会社様から直接掲載いただく求人に加え、ハローワーク（公共職業安定所）に掲載されている求人情報を、
            厚生労働省職業安定局の定めるガイドラインに基づき適切に転載しています。
          </p>
          <p className="mt-2">
            ハローワーク求人の情報は、ハローワークインターネットサービスから取得したものであり、
            最新の情報はハローワークの公式サイトでご確認ください。
            転載にあたっては、出典元の明示および情報の正確性の確保に努めています。
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-gray-900">運営事業者情報</h2>
          <div className="mt-3 overflow-hidden  border border-gray-200">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-200">
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900 w-1/3">
                    事業者名
                  </th>
                  <td className="px-4 py-3">株式会社LET</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    担当者
                  </th>
                  <td className="px-4 py-3">取締役 吉川英治</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    所在地
                  </th>
                  <td className="px-4 py-3">
                    〒541-0058 大阪府大阪市中央区南久宝寺町4丁目4-12 IB CENTERビル8F
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    電話番号
                  </th>
                  <td className="px-4 py-3">06-6786-8320</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    有料職業紹介事業許可番号
                  </th>
                  <td className="px-4 py-3">27-ユ-304693</td>
                </tr>
                <tr>
                  <th className="bg-gray-50 px-4 py-3 text-left font-medium text-gray-900">
                    許可年月日
                  </th>
                  <td className="px-4 py-3">令和7年1月1日</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
