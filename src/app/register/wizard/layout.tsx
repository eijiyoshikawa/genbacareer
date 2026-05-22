import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "求職者登録",
  robots: { index: false, follow: false },
}

export default function WizardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <div className="bg-warm-50">{children}</div>
}
