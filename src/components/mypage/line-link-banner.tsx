import { MessageCircle, Check, AlertCircle } from "lucide-react"

/**
 * LINE 連携バナー（求職者マイページ）。
 *
 * - 未連携: 「LINE と連携して通知を受け取る」CTA（/api/line/link/start へ）。スキップ可。
 * - 連携結果(?line_link=success|error): フィードバックを表示。
 *
 * 連携は任意（強い推奨）。閉じるボタンは付けず、未連携の間は常設で再促しする。
 */
export function LineLinkBanner({
  linked,
  status,
}: {
  linked: boolean
  status?: string
}) {
  // 連携完了直後（成功フィードバック）
  if (status === "success") {
    return (
      <div className="mt-6 flex items-center gap-3 border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <Check className="h-5 w-5 shrink-0" />
        <span>
          <strong>LINE 連携が完了しました。</strong>{" "}
          新着求人やスカウトを LINE でお届けします。
        </span>
      </div>
    )
  }

  // 既に連携済みなら何も出さない
  if (linked) return null

  const failed = status === "error"

  return (
    <div className="mt-6 overflow-hidden border border-[#06C755]/30 bg-gradient-to-br from-[#06C755]/5 to-white p-5 shadow-sm">
      {failed && (
        <div className="mb-3 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          連携に失敗しました。お手数ですが、もう一度お試しください。
        </div>
      )}
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#06C755] text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-gray-900">
            LINE と連携して、求人通知を受け取りませんか？
          </p>
          <p className="mt-1 text-xs text-gray-600">
            新着求人・スカウト・応募の返信を LINE でお知らせします。
            <br className="hidden sm:block" />
            やり取りも LINE で完結。連携は任意です（後からでも設定できます）。
          </p>
          {/* API ルート（サーバ側で LINE へ 302）なので Link ではなく a で遷移する */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/api/line/link/start"
            className="press mt-3 inline-flex items-center gap-1.5 rounded-md bg-[#06C755] px-4 py-2 text-sm font-bold text-white hover:bg-[#05b34c]"
          >
            <MessageCircle className="h-4 w-4" />
            LINE と連携する
          </a>
        </div>
      </div>
    </div>
  )
}
