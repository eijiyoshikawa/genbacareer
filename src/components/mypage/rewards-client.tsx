"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Gift, Loader2, Sparkles } from "lucide-react"

type DrawResult = {
  isWin: boolean
  prizeName: string
  kind: string
  balance: number
}

export function RewardsSpin({
  cost,
  canDraw,
  balance,
  lotteryOpen,
  drawsRemaining,
}: {
  cost: number
  canDraw: boolean
  balance: number
  lotteryOpen: boolean
  drawsRemaining: number
}) {
  const router = useRouter()
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<DrawResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const disabled = spinning || !canDraw

  async function spin() {
    setSpinning(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch("/api/points/lottery", { method: "POST" })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        setError(data.error ?? "抽選に失敗しました")
      } else {
        setResult(data.result as DrawResult)
        // 残高・履歴を最新化
        router.refresh()
      }
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSpinning(false)
    }
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-5">
      <div className="flex items-center gap-2">
        <Gift className="h-5 w-5 text-amber-600" />
        <h2 className="text-base font-bold text-gray-900">抽選にチャレンジ</h2>
      </div>
      <p className="mt-1 text-sm text-gray-600">
        1 回 {cost} ポイントで抽選を回せます（残高: {balance} pt／本日あと {drawsRemaining} 回）
      </p>

      <button
        type="button"
        onClick={spin}
        disabled={disabled}
        className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-amber-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {spinning ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            抽選中…
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            {cost} ポイントで抽選する
          </>
        )}
      </button>

      {!spinning && (
        <p className="mt-2 text-center text-xs text-gray-500">
          {!lotteryOpen
            ? "ただいま景品の準備中です。ポイントは引き続き貯められます。"
            : drawsRemaining <= 0
              ? "本日の抽選は上限に達しました。明日また回せます。"
              : balance < cost
                ? `ポイントが ${cost} pt 貯まると抽選できます`
                : null}
        </p>
      )}

      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-center text-sm text-red-700">
          {error}
        </p>
      )}

      {result && (
        <div
          className={`mt-3 rounded-md px-3 py-4 text-center ${
            result.isWin
              ? "bg-emerald-50 text-emerald-800"
              : "bg-gray-100 text-gray-600"
          }`}
        >
          {result.isWin ? (
            <>
              <p className="text-lg font-extrabold">🎉 当選！</p>
              <p className="mt-1 text-sm font-bold">{result.prizeName}</p>
              {(result.kind === "amazon_gift" || result.kind === "physical") && (
                <p className="mt-1 text-xs text-emerald-700">
                  景品の引き渡し方法は運営よりご連絡します
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-base font-bold">残念！はずれ</p>
              <p className="mt-1 text-xs">また挑戦してください</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
