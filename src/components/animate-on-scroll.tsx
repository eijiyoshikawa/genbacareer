"use client"

import { useEffect, useRef } from "react"

export function AnimateOnScroll({
  children,
  className = "",
  animation = "fade-up",
}: {
  children: React.ReactNode
  className?: string
  animation?: "fade-up" | "stagger"
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("is-visible")
          observer.unobserve(el)
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const cls = animation === "stagger" ? "stagger-children" : "animate-on-scroll"
  return <div ref={ref} className={`${cls} ${className}`}>{children}</div>
}
