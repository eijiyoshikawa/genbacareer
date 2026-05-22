"use client"

import { useEffect, useState, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react"

export type HeroSlide = {
  /** 背景写真 (images.unsplash.com 等 remotePatterns 許可済) */
  image: string
  /** 上部のバッジ (例: "未経験 OK") */
  badge?: string
  /** 主見出し */
  title: string
  /** サブテキスト (任意) */
  subtitle?: string
  /** CTA ボタンのラベル */
  ctaLabel?: string
  /** CTA リンク先 */
  ctaHref?: string
  /** badge の背景色 (Tailwind class — 既定: bg-brand-yellow-500) */
  badgeColor?: string
}

/**
 * トップページ Hero スライドショー。
 *
 * - 自動再生 (既定 6 秒間隔) / ホバー時一時停止
 * - prev / next 矢印 (PC のみ視覚的に表示、SP は dots のみ)
 * - dots によるダイレクトジャンプ
 * - reduced-motion 設定があればクロスフェードを最小化
 *
 * 注: <Image priority> を最初の 1 枚に付け、LCP を守る。
 */
export function HeroSlideshow({
  slides,
  autoplayMs = 6000,
}: {
  slides: HeroSlide[]
  autoplayMs?: number
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const total = slides.length

  const go = useCallback(
    (next: number) => setIndex(((next % total) + total) % total),
    [total],
  )
  const prev = useCallback(() => go(index - 1), [go, index])
  const next = useCallback(() => go(index + 1), [go, index])

  useEffect(() => {
    if (paused || total <= 1) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % total)
    }, autoplayMs)
    return () => window.clearInterval(id)
  }, [paused, total, autoplayMs])

  // キーボード操作 (focus がスライダーに当たっているとき)
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") prev()
    if (e.key === "ArrowRight") next()
  }

  return (
    <section
      className="relative overflow-hidden bg-ink-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={onKey}
      tabIndex={-1}
      aria-roledescription="carousel"
      aria-label="ゲンバキャリア お知らせ・特集スライドショー"
    >
      <div className="relative aspect-[16/7] sm:aspect-[21/8] min-h-[260px] sm:min-h-[360px]">
        {slides.map((s, i) => (
          <div
            key={s.image + i}
            className={`absolute inset-0 transition-opacity duration-700 ${
              i === index ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={i !== index}
          >
            <Image
              src={s.image}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
            />
            {/* 暗オーバーレイ (左→右でフェード) */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-ink-900/90 via-ink-900/55 to-ink-900/15"
            />
            {/* コンテンツ */}
            <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-4 sm:px-6 lg:px-8">
              <div className="max-w-xl text-white">
                {s.badge && (
                  <span
                    className={`inline-block px-3 py-1 text-xs font-extrabold tracking-wide ${
                      s.badgeColor ?? "bg-brand-yellow-500 text-ink-900"
                    }`}
                  >
                    {s.badge}
                  </span>
                )}
                <h2
                  className={`text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight drop-shadow-lg ${
                    s.badge ? "mt-3" : ""
                  }`}
                >
                  {s.title}
                </h2>
                {s.subtitle && (
                  <p className="mt-3 text-sm sm:text-base text-white/90 leading-relaxed drop-shadow max-w-lg">
                    {s.subtitle}
                  </p>
                )}
                {s.ctaLabel && s.ctaHref && (
                  <Link
                    href={s.ctaHref}
                    className="press mt-5 inline-flex items-center gap-1.5 bg-primary-600 px-5 py-2.5 text-sm font-extrabold text-white shadow hover:bg-primary-700"
                  >
                    {s.ctaLabel}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* prev / next (PC のみ表示) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="hidden sm:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center bg-white/90 text-ink-900 shadow hover:bg-white"
            aria-label="前のスライド"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={next}
            className="hidden sm:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center bg-white/90 text-ink-900 shadow hover:bg-white"
            aria-label="次のスライド"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* dots + pause/play */}
      {total > 1 && (
        <div className="absolute bottom-3 sm:bottom-5 left-0 right-0 z-20 flex items-center justify-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => go(i)}
              aria-label={`スライド ${i + 1} に移動`}
              aria-current={i === index}
              className={`h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full transition ${
                i === index ? "bg-white" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? "再生" : "一時停止"}
            className="ml-2 flex h-7 w-7 items-center justify-center bg-white/20 text-white hover:bg-white/35"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </section>
  )
}
