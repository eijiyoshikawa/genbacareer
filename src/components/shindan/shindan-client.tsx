"use client"

import { useState } from "react"
import Link from "next/link"
import {
  SHINDAN_QUESTIONS,
  scoreShindan,
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

export function ShindanClient() {
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<ShindanOption[]>([])

  const total = SHINDAN_QUESTIONS.length
  const done = step >= total

  function choose(opt: ShindanOption) {
    setAnswers((prev) => [...prev, opt])
    setStep((s) => s + 1)
  }

  function restart() {
    setAnswers([])
    setStep(0)
  }

  if (!done) {
    const q = SHINDAN_QUESTIONS[step]
    const progress = Math.round((step / total) * 100)
    return (
      <div className="mx-auto max-w-xl">
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs font-bold text-gray-500">
            <span>
              質問 {step + 1} / {total}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden bg-gray-100">
            <div className="bg-brand-gradient h-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <h2 className="mb-4 text-lg font-bold text-gray-900 sm:text-xl">{q.text}</h2>
        <div className="space-y-2.5">
          {q.options.map((o, i) => (
            <button
              key={i}
              type="button"
              onClick={() => choose(o)}
              className="press block w-full border border-gray-200 bg-white px-4 py-3.5 text-left text-sm font-bold text-gray-800 shadow-sm transition hover:border-primary-400 hover:bg-primary-50"
            >
              {o.label}
            </button>
          ))}
        </div>
        {step > 0 && (
          <button
            type="button"
            onClick={() => {
              setAnswers((prev) => prev.slice(0, -1))
              setStep((s) => s - 1)
            }}
            className="mt-4 text-xs text-gray-500 hover:text-primary-700"
          >
            ← 前の質問に戻る
          </button>
        )}
      </div>
    )
  }

  const ranked = scoreShindan(answers).slice(0, 3)
  const top = ranked[0]

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-center text-sm font-bold text-primary-600">診断結果</p>
      <h2 className="mt-1 text-center text-2xl font-black text-gray-900 sm:text-3xl">
        あなたに向いているのは
        <br />
        <span className="text-brand-gradient">{top ? CAT_LABEL[top] : "建設の仕事"}</span>
      </h2>

      <div className="mt-6 space-y-3">
        {ranked.map((k, i) => (
          <Link
            key={k}
            href={`/jobs?category=${k}`}
            className="press card group block p-4"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-ink-900 text-sm font-extrabold text-white">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-base font-extrabold text-gray-900 group-hover:text-primary-700">
                  {CAT_LABEL[k]}の求人を見る →
                </p>
                <p className="mt-0.5 text-xs text-gray-600 leading-snug">
                  {CAT_BLURB[k]}
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
          この職種の求人を探す
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
