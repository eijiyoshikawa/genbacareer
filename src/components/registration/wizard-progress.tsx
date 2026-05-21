import { REGISTRATION_STEPS, TOTAL_STEPS } from "@/lib/registration/steps"
import { Check } from "@phosphor-icons/react/dist/ssr"

/**
 * ウィザード上部に出すプログレスバー。
 *
 * - "Step X / N" のテキスト + 視覚的プログレスバー
 * - 必須ステップは塗りつぶし丸、スキップ可は中抜き丸
 * - 完了済ステップはチェックマーク
 */
export function WizardProgress({ currentStep }: { currentStep: number }) {
  const percent = Math.round((currentStep / TOTAL_STEPS) * 100)

  return (
    <div className="border-b bg-white">
      <div className="mx-auto max-w-2xl px-4 py-3 sm:px-6">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-bold text-gray-700">
            <span className="text-primary-600 text-base">{currentStep}</span>
            <span className="mx-1 text-gray-400">/</span>
            <span>{TOTAL_STEPS}</span>
          </p>
          <p className="text-[11px] text-gray-500">
            あと約 {Math.max(1, Math.ceil((TOTAL_STEPS - currentStep) * 0.5))} 分で完了
          </p>
        </div>

        {/* プログレスバー */}
        <div className="mt-2 h-1.5 w-full bg-gray-100 overflow-hidden">
          <div
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${percent}%` }}
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            role="progressbar"
          />
        </div>

        {/* ステップマーカー — SP では非表示、PC のみ */}
        <ol className="mt-2 hidden sm:flex items-center justify-between text-[10px] text-gray-400">
          {REGISTRATION_STEPS.map((s) => {
            const isComplete = s.id < currentStep
            const isCurrent = s.id === currentStep
            return (
              <li
                key={s.id}
                className={`flex items-center gap-1 ${
                  isCurrent ? "text-primary-700 font-bold" : ""
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center text-[8px] ${
                    isComplete
                      ? "bg-primary-500 text-white"
                      : isCurrent
                        ? "bg-primary-100 border border-primary-500 text-primary-700"
                        : s.required
                          ? "bg-gray-200"
                          : "border border-gray-300"
                  }`}
                >
                  {isComplete ? <Check weight="bold" className="h-2 w-2" /> : s.id}
                </span>
                <span className="truncate max-w-[64px]">{s.title}</span>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}
