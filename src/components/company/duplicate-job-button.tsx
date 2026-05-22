"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Copy, Loader2 } from "lucide-react"

export function DuplicateJobButton({
  jobId,
  className = "",
}: {
  jobId: string
  className?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function duplicate() {
    if (!confirm("この求人を雛形に下書きを作成しますか？")) return
    setBusy(true)
    try {
      const res = await fetch(`/api/company/jobs/${jobId}/duplicate`, {
        method: "POST",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        alert(data?.error ?? "複製に失敗しました")
        return
      }
      const data = (await res.json()) as { job?: { id?: string } }
      if (data.job?.id) {
        router.push(`/company/jobs/${data.job.id}/edit`)
        return
      }
      router.refresh()
    } catch {
      alert("通信エラーが発生しました")
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={duplicate}
      className={`inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-primary-700 disabled:opacity-50 ${className}`}
      title="この求人を雛形に下書きを作成"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      複製
    </button>
  )
}
