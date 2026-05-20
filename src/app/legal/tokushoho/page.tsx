import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記",
}

const SITE_OPERATOR =
  process.env.NEXT_PUBLIC_SITE_OPERATOR ?? "（運営事業者を設定してください）"
const SITE_REPRESENTATIVE =
  process.env.NEXT_PUBLIC_SITE_REPRESENTATIVE ??
  "（代表者氏名を設定してください）"
const SITE_ADDRESS =
  process.env.NEXT_PUBLIC_SITE_ADDRESS ?? "（所在地を設定してください）"
const SITE_PHONE =
  process.env.NEXT_PUBLIC_SITE_PHONE ?? "（電話番号を設定してください）"
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_SITE_CONTACT_EMAIL ??
  "（お問い合わせ先メールを設定してください）"

export default function TokushohoPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">
        特定商取引法に基づく表記
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        「現場キャリア」（以下、本サイト）の特定商取引法に基づく表記は以下のとおりです。
      </p>

      <dl className="mt-8 grid gap-4 sm:grid-cols-[200px_1fr]">
        <Row label="販売事業者">{SITE_OPERATOR}</Row>
        <Row label="運営責任者">{SITE_REPRESENTATIVE}</Row>
        <Row label="所在地">{SITE_ADDRESS}</Row>
        <Row label="電話番号">{SITE_PHONE}</Row>
        <Row label="メールアドレス">{CONTACT_EMAIL}</Row>
        <Row label="販売価格">
          求人掲載: 無料 / 採用成果報酬: 1 採用あたり所定額（料金は別途ご案内）
        </Row>
        <Row label="商品代金以外の必要料金">
          振込手数料はお客様のご負担となります。
        </Row>
        <Row label="支払方法">クレジットカード（Stripe）または銀行振込</Row>
        <Row label="支払時期">請求書発行後 30 日以内</Row>
        <Row label="サービス提供時期">採用確定の翌営業日以降</Row>
        <Row label="返品・キャンセル">
          採用確定後の成果報酬についてはサービスの性質上、原則として返金には対応いたしかねます。詳細はお問い合わせください。
        </Row>
      </dl>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <>
      <dt className="text-sm font-semibold text-gray-700">{label}</dt>
      <dd className="text-sm text-gray-900 whitespace-pre-wrap">{children}</dd>
    </>
  )
}
