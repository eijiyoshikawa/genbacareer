import Link from "next/link"
import { Building2, ArrowRight } from "lucide-react"

/**
 * 法人番号未登録の企業向けリマインダーバナー。
 *
 * 求人ダッシュボード / 求人投稿画面に貼って、GbizINFO 連携を促す。
 * 法人番号が設定済みなら何も描画しない。
 *
 * @example
 *   <GbizReminderBanner corporateNumber={company.corporateNumber} />
 */
export function GbizReminderBanner({
  corporateNumber,
  context = "dashboard",
}: {
  corporateNumber: string | null
  context?: "dashboard" | "job-form"
}) {
  if (corporateNumber) return null

  const headline =
    context === "job-form"
      ? "公開前に法人番号の登録をご検討ください"
      : "法人番号を登録しませんか？"

  const description =
    context === "job-form"
      ? "GbizINFO 連携で求人カードに「✓ 建設業許可」バッジが付与され、求職者の信頼性が高まります。"
      : "建設業許可・設立年月・表彰歴が求人カード / 企業ページに自動表示され、応募率の向上が期待できます。"

  return (
    <div className="border-l-4 border-emerald-500 bg-emerald-50 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <Building2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-emerald-900">{headline}</p>
          <p className="mt-1 text-xs text-emerald-800 leading-relaxed">
            {description}
          </p>
        </div>
        <Link
          href="/company/gbizinfo"
          className="press inline-flex shrink-0 items-center gap-1 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
        >
          登録する
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  )
}
