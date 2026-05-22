"use client"

import { useState } from "react"
import { Eye, Copy, RefreshCw, Trash2, Loader2, Check } from "lucide-react"

export function PreviewUrlPanel({
  jobId,
  initialToken,
}: {
  jobId: string
  initialToken: string | null
}) {
  const [token, setToken] = useState<string | null>(initialToken)
  const [busy, setBusy] = useState<"generate" | "revoke" | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState("")

  const baseUrl =
    typeof window !== "undefined"
      ? `${window.location.protocol}//${window.location.host}`
      : ""
  const previewUrl = token ? `${baseUrl}/jobs/preview/${token}` : ""

  async function generate() {
    setBusy("generate")
    setError("")
    try {
      const res = await fetch(`/api/company/jobs/${jobId}/preview-token`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "発行に失敗しました")
        return
      }
      const data = (await res.json()) as { token: string }
      setToken(data.token)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setBusy(null)
    }
  }

  async function revoke() {
    if (!confirm("プレビュー URL を無効化しますか？ 共有済みのリンクが使えなくなります。")) return
    setBusy("revoke")
    setError("")
    try {
      const res = await fetch(`/api/company/jobs/${jobId}/preview-token`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "無効化に失敗しました")
        return
      }
      setToken(null)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setBusy(null)
    }
  }

  async function copy() {
    if (!previewUrl) return
    try {
      await navigator.clipboard.writeText(previewUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // 古いブラウザでもフォールバック不要（input で表示しているので手動コピー可能）
    }
  }

  return (
    <section className="border border-sky-200 bg-sky-50/40 p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-sky-900">
        <Eye className="h-4 w-4" />
        プレビュー URL
      </h3>
      <p className="mt-1 text-xs text-sky-800/80 leading-relaxed">
        下書き状態でも社外関係者と共有できる確認用 URL です。応募ボタンは無効化されません。
      </p>

      {error && (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      )}

      {token ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-stretch gap-1">
            <input
              type="text"
              readOnly
              value={previewUrl}
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 min-w-0 border bg-white px-2 py-1.5 text-xs font-mono"
            />
            <button
              type="button"
              onClick={copy}
              className="press inline-flex items-center gap-1 border border-sky-300 bg-white hover:bg-sky-50 px-2 py-1.5 text-xs font-bold text-sky-700"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
              {copied ? "コピー済" : "コピー"}
            </button>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={busy !== null}
              onClick={generate}
              className="inline-flex items-center gap-1 text-sky-700 hover:underline disabled:opacity-50"
            >
              {busy === "generate" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3" />
              )}
              ローテート（旧 URL を無効化して新発行）
            </button>
            <span className="text-gray-300">|</span>
            <button
              type="button"
              disabled={busy !== null}
              onClick={revoke}
              className="inline-flex items-center gap-1 text-red-600 hover:underline disabled:opacity-50"
            >
              {busy === "revoke" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              無効化
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={busy !== null}
          onClick={generate}
          className="press mt-3 inline-flex items-center gap-1.5 border border-sky-300 bg-white hover:bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800 disabled:opacity-50"
        >
          {busy === "generate" ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Eye className="h-3 w-3" />
          )}
          プレビュー URL を発行
        </button>
      )}
    </section>
  )
}
