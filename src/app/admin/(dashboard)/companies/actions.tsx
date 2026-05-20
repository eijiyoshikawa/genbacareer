"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type Props = {
  companyId: string
  approvedAt: Date | null
  suspendedAt: Date | null
}

export function CompanyAdminActions({
  companyId,
  approvedAt,
  suspendedAt,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: "approve" | "suspend" | "unsuspend") {
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        setError(data?.error ?? "更新に失敗しました")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!approvedAt && (
        <button
          type="button"
          onClick={() => run("approve")}
          disabled={pending}
          className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          承認
        </button>
      )}
      {suspendedAt ? (
        <button
          type="button"
          onClick={() => run("unsuspend")}
          disabled={pending}
          className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          解除
        </button>
      ) : (
        <button
          type="button"
          onClick={() => run("suspend")}
          disabled={pending}
          className="rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          停止
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
