"use client"

import { useState } from "react"
import Link from "next/link"
import {
  SHINDAN_QUESTIONS,
  scoreShindan,
  tallyShindan,
  CAT_BLURB,
  type ShindanOption,
  type CatKey,
} from "@/lib/shindan"

const CAT_LABEL: Record<CatKey, string> = {
  construction: "建築・躯体",
  civil: "土木",
  electrical: "電気・設備",
  interior: "内装・仕上げ",
  demolition: "解体・産廃",
  driver: "ドライバー・重機",
  management: "施工管理",
  survey: "測量・設計",
}

const CAT_EMOJI: Record<CatKey, string> = {
  construction: "🏗️",
  civil: "🛣️",
  electrical: "⚡",
  interior: "🎨",
  demolition: "🧱",
  driver: "🚚",
  management: "📋",
  survey: "📐",
}

// 設問ごとの応援コピー
const CHEERS = [
  "まずは直感で！",
  "いい調子！",
  "その調子！",
  "折り返し地点！",
  "あと半分！",
  "ラストスパート！",
  "もうすぐ結果！",
  "最後の質問！",
]

// 選択肢の頭につける記号（A/B/C…）
const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"]

export function ShindanClient() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<ShindanOption[]>([])
  const [picked, setPicked] = useState<number | null>(null)

  const total = SHINDAN_QUESTIONS.length
  const done = step >= total

  function choose(opt: ShindanOption, i: number) {
    if (picked !== null) return
    setPicked(i)
    // 選択フィードバックを見せてから次へ
    setTimeout(() => {
      setAnswers((prev) => [...prev, opt])
      setStep((s) => s + 1)
      setPicked(null)
    }, 280)
  }

  function back() {
    setAnswers((prev) => prev.slice(0, -1))
    setStep((s) => Math.max(0, s - 1))
    setPicked(null)
  }

  function restart() {
    setAnswers([])
    setStep(0)
    setPicked(null)
  }

  if (!done) {
    const q = SHINDAN_QUESTIONS[step]
    return (
      <div className="mx-auto max-w-xl">
        {/* ステップドット */}
        <div className="mb-1 flex items-center justify-center gap-1.5">
          {SHINDAN_QUESTIONS.map((_, i) => (
            <span
              key={i}
              className={`h-2 rounded-full transition-all ${
                i < step
                  ? "w-2 bg-primary-500"
                  : i === step
                    ? "w-6 bg-primary-600"
                    : "w-2 bg-gray-200"
              }`}
            />
          ))}
        </div>
        <p className="mb-4 text-center text-xs font-bold text-primary-600">
          {step + 1} / {total}・{CHEERS[step] ?? "あと少し！"}
        </p>

        {/* key で設問ごとに再マウント → フェードイン */}
        <div key={step} className="shindan-in">
          <h2 className="mb-5 text-center text-lg font-black text-gray-900 sm:text-xl">
            {q.text}
          </h2>
          <div className="space-y-2.5">
            {q.options.map((o, i) => {
              const isPicked = picked === i
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => choose(o, i)}
                  className={`flex w-full items-center gap-3 border-2 px-4 py-3.5 text-left text-sm font-bold transition ${
                    isPicked
                      ? "shindan-pop border-primary-500 bg-primary-50 text-primary-700"
                      : "border-gray-200 bg-white text-gray-800 hover:border-primary-400 hover:bg-primary-50/40"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      isPicked
                        ? "bg-primary-600 text-white"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {LETTERS[i]}
                  </span>
                  <span className="flex-1">{o.label}</span>
                  <span className="shrink-0 text-gray-300">›</span>
                </button>
              )
            })}
          </div>
        </div>

        {step > 0 && (
          <button
            type="button"
            onClick={back}
            className="mt-4 text-xs text-gray-500 hover:text-primary-700"
          >
            ← 前の質問に戻る
          </button>
        )}
      </div>
    )
  }

  // 結果
  const ranked = scoreShindan(answers)
  const tally = tallyShindan(answers)
  const top = ranked[0]
  const topPoints = top ? tally[top] : 0
  const results = ranked.slice(0, 3).map((k) => ({
    key: k,
    // マッチ度: トップを 99% 基準にした相対値（最低 60%）
    pct: topPoints > 0 ? Math.max(60, Math.round((tally[k] / topPoints) * 99)) : 0,
  }))

  return (
    <div className="shindan-in mx-auto max-w-xl text-center">
      <p className="text-3xl">🎉</p>
      <p className="mt-1 text-sm font-bold text-primary-600">診断結果</p>
      <h2 className="mt-1 text-2xl font-black text-gray-900 sm:text-3xl">
        あなたに向いているのは
        <br />
        <span className="text-brand-gradient">
          {top ? `${CAT_EMOJI[top]} ${CAT_LABEL[top]}` : "建設の仕事"}
        </span>
      </h2>

      <div className="mt-6 space-y-3 text-left">
        {results.map((r, i) => (
          <Link
            key={r.key}
            href={`/jobs?category=${r.key}`}
            className="press card group block p-4"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{CAT_EMOJI[r.key]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-extrabold text-gray-900 group-hover:text-primary-700">
                    {i + 1}位　{CAT_LABEL[r.key]}
                  </p>
                  <span className="shrink-0 text-sm font-black text-primary-700">
                    マッチ度 {r.pct}%
                  </span>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden bg-gray-100">
                  <div
                    className="bg-brand-gradient h-full transition-all duration-700"
                    style={{ width: `${r.pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs leading-snug text-gray-600">
                  {CAT_BLURB[r.key]}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
        <Link
          href={top ? `/jobs?category=${top}` : "/jobs"}
          className="press btn-brand-gradient inline-flex items-center justify-center px-6 py-3 text-sm font-extrabold"
        >
          {top ? `${CAT_LABEL[top]}の求人を探す` : "求人を探す"}
        </Link>
        <button
          type="button"
          onClick={restart}
          className="press inline-flex items-center justify-center border border-gray-300 bg-white px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          もう一度診断する
        </button>
      </div>
    </div>
  )
}
