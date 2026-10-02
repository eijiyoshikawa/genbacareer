"use client"

import { useState } from "react"
import { Eye, EyeOff, Copy, Check } from "lucide-react"

/**
 * 企業一覧の「発行ID/PASS」セル。
 * admin が発行したアカウント（issuedLoginPassword が残っているもの）の
 * ログインID・パスワードをその場で確認/コピーできる。
 * パスワードは既定でマスクし、目アイコンで表示切替。
 */
export function CredentialCell({
  email,
  password,
}: {
  email: string
  password: string
}) {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState<"id" | "pw" | null>(null)

  async function copy(kind: "id" | "pw", value: string) {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1500)
    } catch {
      // clipboard 不可の環境では選択コピーで代替（select-all クラス）
    }
  }

  return (
    <div className="space-y-0.5 text-xs">
      <div className="flex items-center gap-1">
        <span className="select-all font-mono text-gray-900">{email}</span>
        <button
          type="button"
          onClick={() => copy("id", email)}
          className="p-0.5 text-gray-400 hover:text-primary-600"
          aria-label="IDをコピー"
          title="IDをコピー"
        >
          {copied === "id" ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
      <div className="flex items-center gap-1">
        <span className="select-all font-mono text-gray-700">
          {show ? password : "••••••••••"}
        </span>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="p-0.5 text-gray-400 hover:text-primary-600"
          aria-label={show ? "パスワードを隠す" : "パスワードを表示"}
          title={show ? "隠す" : "表示"}
        >
          {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
        <button
          type="button"
          onClick={() => copy("pw", password)}
          className="p-0.5 text-gray-400 hover:text-primary-600"
          aria-label="パスワードをコピー"
          title="パスワードをコピー"
        >
          {copied === "pw" ? (
            <Check className="h-3.5 w-3.5 text-emerald-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
