"use client"

/**
 * 17.3 ブロック企業設定: 企業詳細ページからワンクリックでブロック登録/解除。
 *
 * 楽観的 toggle + 失敗時 rollback。
 * 未ログイン時はログインページへ誘導。
 */

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ShieldOff, Shield } from "lucide-react"

interface Props {
  companyId: string
  companyName: string
  initialBlocked: boolean
  loggedIn: boolean
}

export function CompanyBlockButton({
  companyId,
  companyName,
  initialBlocked,
  loggedIn,
}: Props) {
  const router = useRouter()
  const [blocked, setBlocked] = useState(initialBlocked)
  const [busy, setBusy] = useState(false)

  if (!loggedIn) {
    return (
      <Link
        href={`/login?callbackUrl=/companies/${companyId}`}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 underline"
      >
        <Shield className="h-3.5 w-3.5" />
        ログインしてこの企業をブロック
      </Link>
    )
  }

  async function toggle() {
    if (
      blocked
        ? !confirm(`「${companyName}」のブロックを解除しますか？`)
        : !confirm(
            `「${companyName}」をブロックしますか？\n求人検索からこの企業の求人が非表示になります。`
          )
    ) {
      return
    }

    setBusy(true)
    const next = !blocked
    setBlocked(next)
    try {
      const res = await fetch(`/api/users/me/blocked-companies/${companyId}`, {
        method: next ? "POST" : "DELETE",
      })
      if (!res.ok) {
        setBlocked(!next)
        return
      }
      router.refresh()
    } catch {
      setBlocked(!next)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={blocked}
      className={`inline-flex items-center gap-1.5 text-xs underline transition disabled:opacity-50 ${
        blocked
          ? "text-red-600 hover:text-red-700"
          : "text-gray-500 hover:text-red-600"
      }`}
    >
      {blocked ? (
        <>
          <ShieldOff className="h-3.5 w-3.5" />
          ブロック中（解除する）
        </>
      ) : (
        <>
          <Shield className="h-3.5 w-3.5" />
          この企業をブロック
        </>
      )}
    </button>
  )
}
