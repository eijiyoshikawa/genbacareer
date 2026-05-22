"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Shield, Loader2, Check, AlertTriangle, Copy } from "lucide-react"

export function TotpPanel({
  email,
  enabled,
  enabledAt,
  recoveryCodesRemaining,
}: {
  email: string
  enabled: boolean
  enabledAt: string | null
  recoveryCodesRemaining: number
}) {
  const router = useRouter()
  const [step, setStep] = useState<"idle" | "setup" | "verify" | "done">("idle")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [secret, setSecret] = useState("")
  const [qrDataUrl, setQrDataUrl] = useState("")
  const [code, setCode] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [disablePassword, setDisablePassword] = useState("")

  async function startSetup() {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/company/security/totp/setup", {
        method: "POST",
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "失敗しました")
        return
      }
      const data = (await res.json()) as {
        secret: string
        qrDataUrl: string
      }
      setSecret(data.secret)
      setQrDataUrl(data.qrDataUrl)
      setStep("setup")
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/company/security/totp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "コードが正しくありません")
        return
      }
      const data = (await res.json()) as { recoveryCodes: string[] }
      setRecoveryCodes(data.recoveryCodes)
      setStep("done")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    if (!disablePassword) {
      setError("パスワードを入力してください")
      return
    }
    if (!confirm("2 段階認証を無効化しますか？")) return
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/company/security/totp/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: disablePassword }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "無効化に失敗しました")
        return
      }
      setDisablePassword("")
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  if (enabled) {
    return (
      <section className="border border-emerald-200 bg-emerald-50/40 p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-800">
          <Check className="h-5 w-5" />
          <h2 className="text-base font-bold">2 段階認証 有効</h2>
        </div>
        <p className="text-sm text-emerald-900">
          {enabledAt && (
            <>有効化日時: {new Date(enabledAt).toLocaleString("ja-JP")}<br /></>
          )}
          リカバリコード残数: {recoveryCodesRemaining} 件
        </p>

        {error && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="border-t border-emerald-200 pt-4">
          <p className="text-xs text-gray-600">
            無効化するにはパスワードを再入力してください。
          </p>
          <div className="mt-2 flex items-stretch gap-2">
            <input
              type="password"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="flex-1 min-w-0 border px-3 py-1.5 text-sm"
              placeholder="現在のパスワード"
            />
            <button
              type="button"
              disabled={busy}
              onClick={disable}
              className="inline-flex items-center gap-1 border border-red-300 bg-white hover:bg-red-50 px-3 py-1.5 text-sm font-bold text-red-700 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-3 w-3 animate-spin" />}
              無効化
            </button>
          </div>
        </div>
      </section>
    )
  }

  if (step === "done") {
    return (
      <section className="border border-emerald-200 bg-emerald-50 p-6 space-y-4">
        <div className="flex items-center gap-2 text-emerald-800">
          <Check className="h-5 w-5" />
          <h2 className="text-base font-bold">2 段階認証を有効化しました</h2>
        </div>
        <div className="border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            下のリカバリコードを <b>必ず安全な場所に保管</b>してください。
            このコードは認証アプリを失った時の最終手段です。表示は今回のみです。
          </p>
        </div>
        <pre className="bg-white border p-3 text-sm font-mono whitespace-pre-wrap">
          {recoveryCodes.join("\n")}
        </pre>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(recoveryCodes.join("\n")).catch(() => {})
          }}
          className="inline-flex items-center gap-1 border bg-white hover:bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700"
        >
          <Copy className="h-3 w-3" />
          リカバリコードをコピー
        </button>
      </section>
    )
  }

  if (step === "setup" || step === "verify") {
    return (
      <section className="border bg-white p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Shield className="h-5 w-5 text-primary-600" />
          認証アプリで QR を読み取る
        </h2>
        <p className="text-sm text-gray-600">
          Google Authenticator / 1Password / Authy などのアプリで下記の QR を
          スキャンし、表示された 6 桁コードを入力してください。
        </p>

        {qrDataUrl && (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
            <Image
              src={qrDataUrl}
              alt="TOTP QR コード"
              width={200}
              height={200}
              className="border bg-white"
              unoptimized
            />
            <div className="text-xs text-gray-600">
              <p>QR が読み取れない場合は下記のシークレットを手動入力:</p>
              <pre className="mt-1 bg-gray-50 border p-2 font-mono text-xs break-all whitespace-pre-wrap">
                {secret}
              </pre>
              <p className="mt-2">サービス名: ゲンバキャリア</p>
              <p>アカウント: {email}</p>
            </div>
          </div>
        )}

        {error && (
          <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <input
            type="text"
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="flex-1 min-w-0 border px-3 py-2 text-lg tracking-widest font-mono text-center"
            placeholder="000000"
          />
          <button
            type="button"
            disabled={busy || code.length !== 6}
            onClick={verify}
            className="inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy && <Loader2 className="h-3 w-3 animate-spin" />}
            有効化する
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="border bg-white p-6 space-y-4">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
        <Shield className="h-5 w-5 text-primary-600" />
        2 段階認証 (TOTP)
      </h2>
      <p className="text-sm text-gray-600 leading-relaxed">
        Google Authenticator や 1Password などのワンタイムパスワード アプリで
        ログインの 2 段階目を有効化します。パスワード漏洩時の不正ログインを防ぎます。
      </p>
      {error && (
        <div className="border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={startSetup}
        className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Shield className="h-4 w-4" />
        )}
        2 段階認証を設定する
      </button>
    </section>
  )
}
