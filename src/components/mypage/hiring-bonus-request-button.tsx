"use client"

/**
 * 15.6 求職者向け 採用決定ボーナス申請ボタン (dialog 形式)。
 *
 * status=hired Application 1 件につき 1 回申請可能。
 * 既に申請済みなら状態を表示する。
 */

import { useRef, useState } from "react"
import { Gift, Loader2 } from "lucide-react"

interface Props {
  applicationId: string
  alreadyRequested: boolean
}

const PAYOUT_OPTIONS = [
  { value: "amazon_gift", label: "Amazon ギフト券 (メール受領)" },
  { value: "bank_transfer", label: "銀行振込" },
  { value: "cash", label: "現金 (運営から手渡し)" },
] as const

export function HiringBonusRequestButton({
  applicationId,
  alreadyRequested,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [payoutMethod, setPayoutMethod] = useState<string>("amazon_gift")
  const [detailA, setDetailA] = useState("")
  const [detailB, setDetailB] = useState("")
  const [note, setNote] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(alreadyRequested)
  const [error, setError] = useState("")

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 border border-green-300 bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
        <Gift className="h-3.5 w-3.5" />
        お祝い金 申請済み
      </span>
    )
  }

  function open() {
    setError("")
    dialogRef.current?.showModal()
  }
  function close() {
    dialogRef.current?.close()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError("")
    try {
      // payout_details は method ごとに 2 つの項目をまとめて JSON で送る
      const details: Record<string, string> = {}
      if (payoutMethod === "amazon_gift" && detailA) {
        details.email = detailA
      } else if (payoutMethod === "bank_transfer") {
        if (detailA) details.bankAccount = detailA
        if (detailB) details.accountHolder = detailB
      } else if (payoutMethod === "cash" && detailA) {
        details.phone = detailA
      }
      const res = await fetch("/api/users/me/hiring-bonuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          payoutMethod,
          payoutDetails: Object.keys(details).length > 0 ? details : undefined,
          requestNote: note || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? "申請に失敗しました")
        return
      }
      setDone(true)
      setTimeout(close, 2000)
    } catch {
      setError("通信エラー")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="press inline-flex items-center gap-1 border border-rose-500 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 hover:bg-rose-100"
      >
        <Gift className="h-3.5 w-3.5" />
        お祝い金を申請
      </button>

      <dialog
        ref={dialogRef}
        className="max-w-md w-full p-0 bg-white backdrop:bg-black/50"
        aria-labelledby="bonus-dialog-title"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2
              id="bonus-dialog-title"
              className="text-lg font-bold text-gray-900"
            >
              採用お祝い金 申請
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="閉じる"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          {done ? (
            <div className="bg-green-50 p-4 text-sm text-green-700">
              申請を受け付けました。運営の確認後、1〜2 週間以内に支払い手続きを行います。
            </div>
          ) : (
            <>
              <div className="bg-rose-50 p-3 text-sm text-rose-700">
                <p className="font-bold">お祝い金 ¥30,000</p>
                <p className="text-xs mt-1">
                  採用決定 (status=hired) された応募 1 件につき 1 回申請可能です。
                  運営の確認 (実際に入社済みかなど) を経て支払われます。
                </p>
              </div>

              {/* payoutMethod */}
              <fieldset className="space-y-1">
                <legend className="text-xs font-medium text-gray-700">
                  受け取り方法
                </legend>
                <div className="space-y-1">
                  {PAYOUT_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="payoutMethod"
                        value={o.value}
                        checked={payoutMethod === o.value}
                        onChange={(e) => setPayoutMethod(e.target.value)}
                        className="h-3.5 w-3.5"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* method 別の詳細入力 */}
              {payoutMethod === "amazon_gift" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amazon ギフト券送付先 メールアドレス
                  </label>
                  <input
                    type="email"
                    value={detailA}
                    onChange={(e) => setDetailA(e.target.value)}
                    placeholder="example@gmail.com"
                    className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}
              {payoutMethod === "bank_transfer" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      振込先口座 (銀行名 / 支店名 / 種別 / 口座番号)
                    </label>
                    <input
                      type="text"
                      value={detailA}
                      onChange={(e) => setDetailA(e.target.value)}
                      placeholder="○○銀行 △△支店 普通 1234567"
                      className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      口座名義 (カタカナ)
                    </label>
                    <input
                      type="text"
                      value={detailB}
                      onChange={(e) => setDetailB(e.target.value)}
                      placeholder="ヤマダタロウ"
                      className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                    />
                  </div>
                </>
              )}
              {payoutMethod === "cash" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    連絡先電話番号 (受け取り日程調整用)
                  </label>
                  <input
                    type="tel"
                    value={detailA}
                    onChange={(e) => setDetailA(e.target.value)}
                    placeholder="090-1234-5678"
                    className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  申請メモ (任意)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="入社日、その他連絡事項など"
                  className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={close}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  申請する
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </>
  )
}
