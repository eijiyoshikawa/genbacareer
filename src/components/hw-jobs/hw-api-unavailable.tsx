import { AlertTriangle } from "lucide-react"

interface HwApiUnavailableProps {
  reason: "not-configured" | "upstream-error"
}

// エラーの詳細 (DB の接続先やクエリを含む例外メッセージ) は画面に出さない。
export function HwApiUnavailable({ reason }: HwApiUnavailableProps) {
  const headline =
    reason === "not-configured"
      ? "公共求人サービスは現在準備中です"
      : "公共求人を一時的に取得できません"
  const body =
    reason === "not-configured"
      ? "サイト管理者が連携APIの設定を行ったあと、こちらに求人が表示されます。"
      : "しばらく時間をおいてから再度アクセスしてください。"

  return (
    <div className=" border border-amber-200 bg-amber-50 p-6">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-900">{headline}</p>
          <p className="mt-1 text-xs text-amber-800">{body}</p>
        </div>
      </div>
    </div>
  )
}
