"use client"

/**
 * 企業の支払方法 表示コンポーネント。
 * Stripe カード決済廃止後は MoneyForward 一択になったため選択 UI は不要。
 * 現状の支払方法を表示するだけのシンプルな表示にしている。
 * 将来別プロバイダを追加する場合はラジオ UI を復活させる。
 */
export function PaymentMethodSelector({
  currentMethod,
}: {
  companyId: string
  currentMethod: string
}) {
  const label =
    currentMethod === "moneyforward"
      ? "マネーフォワード クラウド請求書 (銀行振込)"
      : "マネーフォワード クラウド請求書 (銀行振込) ※既定"

  return (
    <div className="mt-4 space-y-2 text-sm">
      <p className="font-medium text-gray-900">{label}</p>
      <p className="text-xs text-gray-500">
        請求書 PDF を発行・送付し、銀行振込で支払い。インボイス制度対応。
      </p>
    </div>
  )
}
