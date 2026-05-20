"use client"

/**
 * 通報ボタン + モーダルダイアログ (6.2)。
 *
 * 求人詳細・企業ページ・口コミなどに `<ReportButton targetType="job" targetId={...} />`
 * として埋め込む。
 *
 * - 未ログインでも送信可能
 * - 送信後は「通報を受け付けました」のトースト表示
 * - dialog 要素ベースで a11y 準拠（ESC で閉じる / focus トラップは native）
 */

import { useRef, useState } from "react"
import { Flag } from "lucide-react"
import { REPORT_REASONS, type ReportTargetType } from "@/lib/report-reasons"

interface Props {
  targetType: ReportTargetType
  targetId: string
  /** ボタンに表示するラベル。デフォルト「通報」 */
  label?: string
  /** ボタンを軽量リンク風にする (false ならアイコン付きボタン) */
  asLink?: boolean
}

export function ReportButton({ targetType, targetId, label = "通報", asLink = true }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].value)
  const [detail, setDetail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  function openDialog() {
    setDone(false)
    setError("")
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          detail: detail.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "送信に失敗しました")
        return
      }
      setDone(true)
      setTimeout(() => {
        closeDialog()
      }, 1500)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {asLink ? (
        <button
          type="button"
          onClick={openDialog}
          className="text-xs text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 underline"
        >
          {label}
        </button>
      ) : (
        <button
          type="button"
          onClick={openDialog}
          className="inline-flex items-center gap-1.5 border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          <Flag className="h-3.5 w-3.5" />
          {label}
        </button>
      )}

      <dialog
        ref={dialogRef}
        className="max-w-md w-full p-0 bg-white dark:bg-gray-900 backdrop:bg-black/50"
        aria-labelledby="report-dialog-title"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="report-dialog-title"
              className="text-lg font-bold text-gray-900 dark:text-gray-100"
            >
              この投稿を通報する
            </h2>
            <button
              type="button"
              onClick={closeDialog}
              aria-label="閉じる"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>

          {done ? (
            <div className="bg-green-50 dark:bg-green-900/30 p-4 text-sm text-green-700 dark:text-green-300">
              通報を受け付けました。運営で内容を確認いたします。
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                通報内容は運営に届きます。第三者には開示されません。
                虚偽の通報はアカウント停止の対象となる場合があります。
              </p>

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  通報理由
                </legend>
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={(e) => setReason(e.target.value)}
                      className="h-4 w-4 border-gray-300 text-primary-600"
                    />
                    <span className="text-gray-700 dark:text-gray-200">{r.label}</span>
                  </label>
                ))}
              </fieldset>

              <div>
                <label
                  htmlFor="report-detail"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  詳細（任意・2000 文字まで）
                </label>
                <textarea
                  id="report-detail"
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                  placeholder="具体的な内容があれば記載してください。"
                />
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-600 dark:text-red-300">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={closeDialog}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {submitting ? "送信中..." : "通報する"}
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </>
  )
}
