"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

type PendingInvitation = {
  id: string
  email: string
  role: string
  expiresAt: string
  createdAt: string
}

export function InvitationManager({
  companyId,
  pendingInvitations,
}: {
  companyId: string
  pendingInvitations: PendingInvitation[]
}) {
  const router = useRouter()
  const [method, setMethod] = useState<"email" | "direct">("email")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState<"admin" | "member">("admin")
  const [error, setError] = useState("")
  const [warning, setWarning] = useState("")
  const [loading, setLoading] = useState(false)
  const [issued, setIssued] = useState<
    | { method: "email"; inviteUrl: string; email: string; expiresAt: string }
    | { method: "direct"; email: string; temporaryPassword: string }
    | null
  >(null)
  const [busyInvId, setBusyInvId] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setWarning("")
    setIssued(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          method === "email"
            ? { method: "email", email, role }
            : { method: "direct", email, name: name || undefined, role }
        ),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "発行に失敗しました")
        return
      }
      if (data.warning) setWarning(data.warning)

      if (method === "email") {
        const inviteUrl = `${window.location.origin}/company/invite/${data.token ?? ""}`
        setIssued({
          method: "email",
          inviteUrl,
          email,
          expiresAt: data.expiresAt,
        })
      } else {
        setIssued({
          method: "direct",
          email: data.email,
          temporaryPassword: data.temporaryPassword,
        })
      }
      setEmail("")
      setName("")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const resend = async (invId: string) => {
    if (!confirm("招待メールを再送しますか？（トークンも再発行されます）")) return
    setBusyInvId(invId)
    try {
      const res = await fetch(
        `/api/admin/companies/${companyId}/invitations/${invId}`,
        { method: "POST" }
      )
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "再送に失敗しました")
        return
      }
      if (data.warning) alert(data.warning)
      else alert("再送しました")
      router.refresh()
    } finally {
      setBusyInvId(null)
    }
  }

  const revoke = async (invId: string) => {
    if (!confirm("この招待を取消しますか？")) return
    setBusyInvId(invId)
    try {
      const res = await fetch(
        `/api/admin/companies/${companyId}/invitations/${invId}`,
        { method: "DELETE" }
      )
      const data = await res.json()
      if (!res.ok) {
        alert(data.error ?? "取消に失敗しました")
        return
      }
      router.refresh()
    } finally {
      setBusyInvId(null)
    }
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      alert("コピーしました")
    } catch {
      // fallback
      prompt("以下を手動でコピーしてください:", text)
    }
  }

  return (
    <div className="border bg-white p-6 shadow-sm">
      <h2 className="font-bold text-gray-900">ログイン情報を発行</h2>

      {/* Issuance form */}
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={method === "email"}
              onChange={() => setMethod("email")}
            />
            招待メール（受信者がパスワード設定）
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={method === "direct"}
              onChange={() => setMethod("direct")}
            />
            直接発行（仮 PW を手渡し）
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              メールアドレス <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full border px-3 py-2 text-sm"
              placeholder="contact@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              権限
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "member")}
              className="mt-1 block w-full border px-3 py-2 text-sm"
            >
              <option value="admin">admin（管理者）</option>
              <option value="member">member（メンバー）</option>
            </select>
          </div>
          {method === "direct" && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700">
                お名前 <span className="text-gray-400">(任意)</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                className="mt-1 block w-full border px-3 py-2 text-sm"
              />
            </div>
          )}
        </div>

        {error && (
          <p className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {warning && (
          <p className="border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {warning}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
        >
          {loading ? "発行中..." : "発行する"}
        </button>
      </form>

      {/* Issued result (one-time display) */}
      {issued && issued.method === "direct" && (
        <div className="mt-6 border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-bold text-green-900">
            アカウントを発行しました（この画面でしか表示されません）
          </p>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <dt className="w-32 text-gray-600">メール:</dt>
              <dd className="font-mono">{issued.email}</dd>
            </div>
            <div className="flex items-center gap-3">
              <dt className="w-32 text-gray-600">仮パスワード:</dt>
              <dd className="font-mono text-base">
                {issued.temporaryPassword}
              </dd>
              <button
                type="button"
                onClick={() => copy(issued.temporaryPassword)}
                className="ml-auto border bg-white px-3 py-1 text-xs hover:bg-gray-50"
              >
                コピー
              </button>
            </div>
          </dl>
          <p className="mt-3 text-xs text-green-800">
            初回ログイン時にパスワード変更が強制されます。
          </p>
        </div>
      )}

      {issued && issued.method === "email" && (
        <div className="mt-6 border border-green-300 bg-green-50 p-4">
          <p className="text-sm font-bold text-green-900">
            招待メールを送信しました
          </p>
          <p className="mt-2 text-sm text-green-800">
            送信先: <span className="font-mono">{issued.email}</span>
            <br />
            有効期限: {new Date(issued.expiresAt).toLocaleString("ja-JP")}
          </p>
        </div>
      )}

      {/* Pending invitations list */}
      {pendingInvitations.length > 0 && (
        <div className="mt-8">
          <h3 className="font-medium text-gray-900">未受領の招待</h3>
          <ul className="mt-3 divide-y border">
            {pendingInvitations.map((inv) => {
              const expired = new Date(inv.expiresAt).getTime() < Date.now()
              return (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono">{inv.email}</p>
                    <p className="text-xs text-gray-500">
                      {inv.role} · 発行 {new Date(inv.createdAt).toLocaleDateString("ja-JP")} · 期限{" "}
                      {new Date(inv.expiresAt).toLocaleDateString("ja-JP")}
                      {expired && (
                        <span className="ml-1 text-red-600">(期限切れ)</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => resend(inv.id)}
                      disabled={busyInvId === inv.id}
                      className="border bg-white px-3 py-1 text-xs hover:bg-gray-50 disabled:opacity-50"
                    >
                      再送
                    </button>
                    <button
                      type="button"
                      onClick={() => revoke(inv.id)}
                      disabled={busyInvId === inv.id}
                      className="border border-red-300 bg-white px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      取消
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
