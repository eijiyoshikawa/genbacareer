import Link from "next/link"
import { MessageCircle, Banknote } from "lucide-react"
import { InterestButton } from "./interest-button"

/**
 * 求人詳細ページの下部固定アクションバー。
 * モバイルでは画面下部に常に表示、デスクトップでは画面下部に固定（やや控えめなサイズ）。
 *
 * 左 (sm+): 求人タイトル + 会社名（参照のため）
 * 左 (mobile): 給与情報（あれば）を小さく表示。スクロールしても給与が見える。
 * 右: 「気になる」(12.3) + 「話を聞きたい (応募)」
 */
export function StickyActionBar({
  jobId,
  title,
  companyName,
  salaryLabel,
  initialInterested,
  loggedIn,
  closed = false,
}: {
  jobId: string
  title: string
  companyName: string | null
  salaryLabel?: string | null
  initialInterested: boolean
  loggedIn: boolean
  closed?: boolean
}) {
  return (
    <div className="fixed bottom-0 inset-x-0 z-30 border-t-2 border-primary-500 bg-white shadow-[0_-6px_16px_rgba(0,0,0,0.06)]">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2.5 flex items-center gap-3">
        <div className="hidden sm:flex flex-1 min-w-0 flex-col">
          <span className="text-sm font-semibold text-gray-900 line-clamp-1">
            {title}
          </span>
          {companyName && (
            <span className="text-xs text-gray-500 line-clamp-1">
              {companyName}
            </span>
          )}
        </div>

        {/* モバイル: 給与表示で誘導 */}
        {salaryLabel && (
          <div className="flex sm:hidden flex-1 min-w-0 items-center gap-1.5">
            <Banknote className="h-4 w-4 text-primary-500 shrink-0" />
            <span className="text-sm font-bold text-primary-700 line-clamp-1">
              {salaryLabel}
            </span>
          </div>
        )}

        {/* 気になる (12.3 ライト応募) */}
        {!closed && (
          <div className="hidden sm:inline-flex">
            <InterestButton
              jobId={jobId}
              initialInterested={initialInterested}
              loggedIn={loggedIn}
              variant="button"
            />
          </div>
        )}

        {closed ? (
          <Link
            href="/jobs"
            className="press shrink-0 inline-flex items-center justify-center gap-2 bg-gray-400 px-5 py-3 text-sm sm:text-base font-bold text-white shadow-sm transition"
          >
            募集終了・他の求人を探す
          </Link>
        ) : (
          <Link
            href={`/jobs/${jobId}/apply`}
            className="press shrink-0 inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 px-5 py-3 text-sm sm:text-base font-bold text-white shadow-sm transition"
          >
            <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
            話を聞きたい
          </Link>
        )}
      </div>
    </div>
  )
}
