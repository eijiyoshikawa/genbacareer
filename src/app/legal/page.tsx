import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
  description:
    "ゲンバキャリアの特定商取引法に基づく表記。販売事業者・所在地・連絡先・料金・支払方法等の表示。",
  alternates: { canonical: "/legal" },
}

const ROWS: Array<{
  label: string
  value: React.ReactNode
}> = [
  {
    label: "販売業者",
    value: "株式会社LET",
  },
  {
    label: "代表責任者",
    value: "代表取締役 吉田 翔太",
  },
  {
    label: "担当者",
    value: "取締役 吉川 英治",
  },
  {
    label: "所在地",
    value: (
      <>
        〒541-0058
        <br />
        大阪府大阪市中央区南久宝寺町4-4-12 IB CENTERビル8F
      </>
    ),
  },
  {
    label: "電話番号",
    value: "06-6786-8320",
  },
  {
    label: "受付時間",
    value: "平日 10:00〜19:00（土日祝除く）",
  },
  {
    label: "メールアドレス",
    value: "info@let-inc.net",
  },
  {
    label: "事業内容",
    value: (
      <>
        建設業界に特化した求人情報サービス「ゲンバキャリア」の運営
        <br />
        有料職業紹介事業（許可番号: 27-ユ-304693）
      </>
    ),
  },
  {
    label: "サービス利用料金",
    value: (
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>求職者の方</strong>: 無料
        </li>
        <li>
          <strong>求人掲載企業様</strong>: 求人掲載は <strong>無料キャンペーン中</strong>（期間中の新規掲載に限る）。
          採用が決定した場合のみ <strong>採用者の理論年収の 35%（1 名あたり）</strong> の成果報酬が発生します。
        </li>
      </ul>
    ),
  },
  {
    label: "料金以外の必要料金",
    value: "通信料はお客様のご負担となります。",
  },
  {
    label: "支払方法",
    value: (
      <>
        銀行振込（マネーフォワード クラウド請求書経由で適格請求書を発行）
      </>
    ),
  },
  {
    label: "支払時期",
    value:
      "採用決定の通知後、当社からの請求書発行日より 30 日以内にお支払いください。",
  },
  {
    label: "サービス提供時期",
    value:
      "求人掲載: 企業登録の承認後、求人投稿が可能となります（通常 1〜2 営業日以内）。",
  },
  {
    label: "返品・キャンセル",
    value: (
      <>
        サービスの性質上、採用決定後の成果報酬の返金には応じかねます。
        <br />
        ただし、当社の責に帰すべき事由による不履行の場合はこの限りではありません。
        詳細は <Link href="/contact" className="text-primary-600 underline">お問い合わせ</Link> よりご連絡ください。
      </>
    ),
  },
  {
    label: "動作環境",
    value: (
      <ul className="list-disc space-y-1 pl-5">
        <li>推奨ブラウザ: Google Chrome / Safari / Microsoft Edge の最新版</li>
        <li>JavaScript / Cookie を有効にしてご利用ください</li>
      </ul>
    ),
  },
]

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">
        特定商取引法に基づく表記
      </h1>
      <p className="mt-2 text-sm text-gray-500">最終更新日: 2026年5月9日</p>

      <div className="mt-8 overflow-hidden border bg-white">
        <dl className="divide-y">
          {ROWS.map((row) => (
            <div
              key={row.label}
              className="grid gap-1 px-4 py-4 sm:grid-cols-[180px_1fr] sm:gap-4"
            >
              <dt className="text-sm font-semibold text-gray-700">
                {row.label}
              </dt>
              <dd className="text-sm text-gray-900 leading-relaxed">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      <p className="mt-6 text-xs text-gray-500">
        本表記は特定商取引法第 11 条に基づき、当社が運営する有料サービスに関する事項を表示するものです。
      </p>
    </div>
  )
}
