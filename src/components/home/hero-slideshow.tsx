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
      <div className="relative aspect-[16/11] sm:aspect-[21/8] min-h-[340px] sm:min-h-[420px]">
        {slides.map((s, i) => {
          // マガジン風: 写真を主役にし、下からのグラデーション上に見出しを下寄せ配置。
          // スライド全体をリンクにして、写真クリックでも記事へ遷移できるようにする。
          const inner = (
            <>
              <Image
                src={s.image}
                alt=""
                fill
                priority={i === 0}
                sizes="100vw"
                className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]"
              />
              {/* 下→上の暗グラデ（写真の上側はほぼ素のまま見せる） */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/45 to-ink-900/5"
              />
              {/* コンテンツ（下寄せ） */}
              <div className="relative z-10 mx-auto flex h-full max-w-7xl items-end px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
                <div className="max-w-2xl text-white">
                  {s.badge && (
                    <span
                      className={`inline-block px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${
                        s.badgeColor ?? "bg-brand-yellow-500 text-ink-900"
                      }`}
                    >
                      {s.badge}
                    </span>
                  )}
                  <h2
                    className={`text-2xl font-extrabold leading-tight tracking-tight drop-shadow-lg line-clamp-2 sm:text-4xl lg:text-[2.75rem] ${
                      s.badge ? "mt-2.5" : ""
                    }`}
                  >
                    {s.title}
                  </h2>
                  {s.subtitle && (
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85 drop-shadow line-clamp-2 sm:text-base">
                      {s.subtitle}
                    </p>
                  )}
                  {s.ctaLabel && (
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-extrabold text-brand-yellow-300 transition-all group-hover:gap-2.5">
                      {s.ctaLabel}
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  )}
                </div>
              </div>
            </>
          )
          return (
            <div
              key={s.image + i}
              className={`absolute inset-0 transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-hidden={i !== index}
            >
              {s.ctaHref ? (
                <Link href={s.ctaHref} className="group block h-full w-full">
                  {inner}
                </Link>
              ) : (
                <div className="group block h-full w-full">{inner}</div>
              )}
            </div>
          )
        })}
      </div>

      {/* prev / next (PC のみ表示) */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={prev}
            className="group/nav hidden sm:flex absolute left-5 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-ink-900/25 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-transparent hover:bg-brand-yellow-500 hover:text-ink-900 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow-300 active:scale-95"
            aria-label="前のスライド"
          >
            <ChevronLeft className="h-5 w-5 transition-transform duration-200 group-hover/nav:-translate-x-0.5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={next}
            className="group/nav hidden sm:flex absolute right-5 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full border border-white/30 bg-ink-900/25 text-white shadow-lg backdrop-blur-md transition-all duration-200 hover:scale-110 hover:border-transparent hover:bg-brand-yellow-500 hover:text-ink-900 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow-300 active:scale-95"
            aria-label="次のスライド"
          >
            <ChevronRight className="h-5 w-5 transition-transform duration-200 group-hover/nav:translate-x-0.5" strokeWidth={2.5} />
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
              className={`h-2 sm:h-2.5 rounded-full transition-all duration-300 ${
                i === index
                  ? "w-5 sm:w-6 bg-brand-yellow-500"
                  : "w-2 sm:w-2.5 bg-white/40 hover:bg-white/70"
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
