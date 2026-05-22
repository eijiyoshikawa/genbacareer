"use client"

import { useMemo } from "react"
import { AlertTriangle } from "lucide-react"
import { checkJobFields } from "@/lib/job-compliance"

/**
 * 求人作成ウィザード内で、入力中の文章に差別表現や法令違反の懸念が
 * ないかをリアルタイムでチェックして警告する。
 *
 * 強制ブロックはしないが、企業に再考を促す。
 */
export function ComplianceWarnings({
  title,
  description,
  requirements,
}: {
  title: string
  description: string
  requirements: string
}) {
  const issues = useMemo(
    () => checkJobFields({ title, description, requirements }),
    [title, description, requirements]
  )

  if (issues.length === 0) return null

  return (
    <div
      role="alert"
      aria-live="polite"
      className="border-l-4 border-amber-500 bg-amber-50 p-4"
    >
      <div className="flex items-start gap-2">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-amber-900">
            求人広告のコンプライアンス上、再考が必要な可能性のある表現が
            {issues.length} 件あります
          </p>
          <ul className="mt-2 space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="text-xs">
                <span className="inline-block bg-white border border-amber-300 px-2 py-0.5 font-mono text-amber-700">
                  {issue.match}
                </span>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  {issue.message}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-amber-700">
            これは助言であり、法的判断ではありません。最終的な掲載可否は
            各企業様の判断にお任せします。
          </p>
        </div>
      </div>
    </div>
  )
}
