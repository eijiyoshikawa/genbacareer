/**
 * 全画面ローディングオーバーレイ。
 * loading.tsx に置くと Suspense fallback として全画面を覆う。
 *
 * デザイン:
 * - z-50 fixed で header/footer も覆う
 * - ブランドオレンジの円が外側からフェードイン
 * - 中央に G ロゴ（pulse）
 * - 下部に走るプログレスバー（無限ループ）
 */
export function FullScreenLoader({
  label = "読み込み中...",
}: {
  label?: string
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-warm-50"
    >
      {/* 中央ロゴ + リング */}
      <div className="relative flex flex-col items-center">
        {/* 外周リング (回転) */}
        <div className="absolute -inset-8 animate-[spin_2.4s_linear_infinite]">
          <div className="h-full w-full rounded-full border-2 border-transparent border-t-primary-600 border-r-primary-400" />
        </div>

        {/* 中央ロゴ円 */}
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary-600 shadow-lg shadow-primary-600/30">
          <span className="text-3xl font-black tracking-tight text-white">
            G
          </span>
          {/* ping パルス */}
          <span className="absolute inset-0 animate-ping rounded-full bg-primary-600 opacity-20" />
        </div>

        {/* ブランド名 (フェードイン+アップ) */}
        <p className="mt-6 text-sm font-semibold text-gray-700 [animation:fadeUp_0.6s_ease-out]">
          ゲンバキャリア
        </p>
        <p className="mt-1 text-xs text-gray-500">{label}</p>
      </div>

      {/* 下部プログレスバー (無限ループ) */}
      <div className="absolute bottom-0 left-0 right-0 h-1 overflow-hidden bg-warm-100">
        <div
          className="h-full w-1/3 bg-gradient-to-r from-primary-400 via-primary-600 to-primary-400"
          style={{
            animation: "slide 1.4s ease-in-out infinite",
          }}
        />
      </div>

      {/* 全画面ロード時の keyframes をインライン定義 */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
