"use client"

import { useRouter } from "next/navigation"
import { ArrowRight, SkipForward, ArrowLeft } from "lucide-react"
import { useTransition } from "react"

/**
 * 各ステップの共通レイアウト:
 * - 中央寄せ + タイトル + 説明
 * - 下部固定の「次へ」ボタン (canProceed が true でのみ有効)
 * - 必須でないステップは「スキップ」ボタンも表示
 * - 戻るリンク (上部)
 */
export function StepShell({
  title,
  description,
  required,
  canProceed,
  onNext,
  nextHref,
  nextLabel = "次へ",
  skipHref,
  prevHref,
  children,
}: {
  title: string
  description?: string
  required: boolean
  /** 必須項目が満たされていれば true (次へ enable) */
  canProceed: boolean
  /** 次へ押下時のカスタムハンドラ (省略時は nextHref に router.push) */
  onNext?: () => Promise<void> | void
  /** 次へボタンのリンク先 */
  nextHref?: string
  /** 次へボタンのテキスト (既定: "次へ"、最終ステップでは "登録する" 等) */
  nextLabel?: string
  /** スキップボタンのリンク先 (required=false のみ表示) */
  skipHref?: string
  /** 戻るリンク先 (省略時は表示しない) */
  prevHref?: string
  children: React.ReactNode
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const handleNext = async () => {
    if (onNext) {
      await onNext()
    }
    if (nextHref) {
      startTransition(() => router.push(nextHref))
    }
  }

  const handleSkip = () => {
    if (skipHref) {
      startTransition(() => router.push(skipHref))
    }
  }

  return (
    <div className="bg-warm-50 min-h-[calc(100dvh-180px)]">
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
        {/* 戻る */}
        {prevHref && (
          <button
            type="button"
            onClick={() => router.push(prevHref)}
            className="press inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            前に戻る
          </button>
        )}

        {/* 本体カード */}
        <div className="card-elevated bg-white p-5 sm:p-8">
          <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {description}
            </p>
          )}
          <div className="mt-6">{children}</div>
        </div>

        {/* 次へ + スキップ (下部固定はしない、コンテンツ末尾) */}
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          {!required && skipHref && (
            <button
              type="button"
              onClick={handleSkip}
              disabled={pending}
              className="press border-2 border-gray-300 bg-white px-5 py-3 text-sm font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700 transition disabled:opacity-50 sm:order-1 inline-flex items-center justify-center gap-1.5"
            >
              <SkipForward className="h-4 w-4" />
              スキップして次へ
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canProceed || pending}
            className={`press inline-flex items-center justify-center gap-1.5 px-5 py-3 text-sm font-extrabold text-white shadow-sm transition ${
              required && !skipHref ? "col-span-full" : "sm:order-2"
            } ${
              canProceed
                ? "bg-primary-600 hover:bg-primary-700"
                : "bg-gray-300 cursor-not-allowed"
            }`}
          >
            {pending ? "..." : nextLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* 必須項目バッジ (任意のとき) */}
        {!required && (
          <p className="mt-3 text-center text-[11px] text-gray-500">
            この項目は後で /mypage/profile から編集できます
          </p>
        )}
      </div>
    </div>
  )
}
