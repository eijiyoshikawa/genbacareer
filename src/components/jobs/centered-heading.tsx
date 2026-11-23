import { type ReactNode } from "react"

/**
 * マイナビ転職風の「中央寄せ太字 + 短い下線」見出し。
 * AccordionSection の内側で、サブセクションの題を出すときに使う。
 */
export function CenteredHeading({
  children,
  tone = "primary",
}: {
  children: ReactNode
  tone?: "primary" | "yellow" | "ink"
}) {
  const barColor =
    tone === "yellow"
      ? "bg-brand-yellow-500"
      : tone === "ink"
      ? "bg-ink-900"
      : "bg-primary-500"
  return (
    <div className="text-center">
      <p className="text-base font-bold text-ink-900 sm:text-lg">{children}</p>
      <span
        aria-hidden
        className={`mx-auto mt-2 block h-0.5 w-10 ${barColor}`}
      />
    </div>
  )
}
