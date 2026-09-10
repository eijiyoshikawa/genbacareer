"use client"

/**
 * 12.2 企業口コミ投稿フォーム (modal style)。
 * ログイン必須（1 アカウント 1 社 1 件まで）、admin モデレーション後に公開される旨を明示。
 */

import { useRef, useState } from "react"
import { Star, MessageSquarePlus } from "lucide-react"

interface Props {
  companyId: string
  companyName: string
}

const EMPLOYMENT_OPTIONS = [
  { value: "current", label: "現在在籍" },
  { value: "former", label: "元従業員" },
  { value: "interview", label: "面接のみ経験" },
]

export function CompanyReviewForm({ companyId, companyName }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [employmentStatus, setEmploymentStatus] = useState("former")
  const [rating, setRating] = useState(3)
  const [title, setTitle] = useState("")
  const [goodPoints, setGoodPoints] = useState("")
  const [badPoints, setBadPoints] = useState("")
  const [advice, setAdvice] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  function open() {
    setDone(false)
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
      const res = await fetch(`/api/companies/${companyId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employmentStatus,
          rating,
          title: title || undefined,
          goodPoints: goodPoints || undefined,
          badPoints: badPoints || undefined,
          advice: advice || undefined,
          displayName: displayName || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? "送信に失敗しました")
        return
      }
      setDone(true)
      setTimeout(close, 2500)
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
        className="inline-flex items-center gap-1.5 border border-primary-400 text-primary-700 px-3 py-1.5 text-xs font-bold hover:bg-primary-50"
      >
        <MessageSquarePlus className="h-3.5 w-3.5" />
        口コミを書く
      </button>

      <dialog
        ref={dialogRef}
        className="max-w-lg w-full p-0 bg-white backdrop:bg-black/50"
        aria-labelledby="review-dialog-title"
      >
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 id="review-dialog-title" className="text-lg font-bold text-gray-900">
              「{companyName}」に口コミを投稿
            </h2>
            <button type="button" onClick={close} aria-label="閉じる" className="text-gray-400 hover:text-gray-600">✕</button>
          </div>

          {done ? (
            <div className="bg-green-50 p-4 text-sm text-green-700">
              口コミを受け付けました。運営の確認後に公開されます。
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">
                投稿は匿名扱いです。運営による内容確認後に公開されます (1〜3 営業日)。
                個人名・誹謗中傷・営業情報は掲載できません。
              </p>

              {/* 雇用状況 */}
              <fieldset className="space-y-1">
                <legend className="text-xs font-medium text-gray-700">
                  雇用状況
                </legend>
                <div className="flex flex-wrap gap-3">
                  {EMPLOYMENT_OPTIONS.map((o) => (
                    <label key={o.value} className="flex items-center gap-1 text-sm">
                      <input
                        type="radio"
                        name="employmentStatus"
                        value={o.value}
                        checked={employmentStatus === o.value}
                        onChange={(e) => setEmploymentStatus(e.target.value)}
                        className="h-3.5 w-3.5"
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {/* 総合星評価 */}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">
                  総合評価
                </p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} 星`}
                      className="text-2xl"
                    >
                      <Star
                        className={`h-7 w-7 ${
                          n <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  タイトル (任意)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  placeholder="例: 教育体制がしっかりしていて未経験でも安心"
                  className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div className="grid gap-3">
                <Textarea
                  label="良かった点"
                  value={goodPoints}
                  onChange={setGoodPoints}
                  placeholder="現場の雰囲気、給与、教育、福利厚生など"
                />
                <Textarea
                  label="改善してほしい点"
                  value={badPoints}
                  onChange={setBadPoints}
                  placeholder="残業、人間関係、設備、シフト管理など"
                />
                <Textarea
                  label="入社を検討する人へのアドバイス"
                  value={advice}
                  onChange={setAdvice}
                  placeholder="向いている人、面接時の注意点など"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  表示名 (任意。未入力なら「建設業界の方」)
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  placeholder="例: 元・施工管理"
                  className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              {error && (
                <div className="bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={close} className="text-sm text-gray-500 hover:text-gray-700">
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50"
                >
                  {submitting ? "送信中..." : "投稿する"}
                </button>
              </div>
            </>
          )}
        </form>
      </dialog>
    </>
  )
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder={placeholder}
        className="block w-full border border-gray-300 bg-white px-3 py-2 text-sm"
      />
    </div>
  )
}
