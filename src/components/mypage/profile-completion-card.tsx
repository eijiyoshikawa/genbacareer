import Link from "next/link"
import { CheckCircle2, Circle, TrendingUp } from "lucide-react"
import type { CompletionItem } from "@/lib/profile-completion"

/**
 * マイページ用のプロフィール完了率カード。
 * 100% 未満の項目が並ぶ。クリックでプロフィール / 履歴書ページへ。
 */
export function ProfileCompletionCard({
  percent,
  items,
}: {
  percent: number
  items: CompletionItem[]
}) {
  const undone = items.filter((it) => !it.done)
  const colorClass =
    percent >= 80
      ? "bg-emerald-500"
      : percent >= 50
        ? "bg-amber-500"
        : "bg-red-400"
  const labelClass =
    percent >= 80
      ? "text-emerald-700"
      : percent >= 50
        ? "text-amber-700"
        : "text-red-700"

  return (
    <div className="border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
            <TrendingUp className="h-4 w-4 text-primary-500" />
            プロフィール完了率
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            完了率が高いほどスカウトを受け取りやすくなります
          </p>
        </div>
        <p className={`text-2xl font-extrabold ${labelClass}`}>{percent}%</p>
      </div>

      <div className="mt-3 h-2 w-full overflow-hidden bg-gray-100">
        <div
          className={`h-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      {undone.length > 0 ? (
        <>
          <p className="mt-4 text-xs font-bold text-gray-700">
            あと {undone.length} 項目で完了
          </p>
          <ul className="mt-2 space-y-1.5">
            {undone.slice(0, 4).map((it) => (
              <li
                key={it.key}
                className="flex items-center gap-2 text-xs text-gray-600"
              >
                <Circle className="h-3.5 w-3.5 shrink-0 text-gray-300" />
                {it.label}
              </li>
            ))}
            {undone.length > 4 && (
              <li className="text-xs text-gray-400">
                ほか {undone.length - 4} 項目
              </li>
            )}
          </ul>
          <Link
            href={
              undone.some((it) => it.key === "resumeUrl")
                ? "/mypage/resume"
                : "/mypage/profile"
            }
            className="press mt-4 inline-flex w-full items-center justify-center bg-primary-600 px-3 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            プロフィールを完成させる
          </Link>
        </>
      ) : (
        <p className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          すべての項目が入力済みです
        </p>
      )}
    </div>
  )
}
