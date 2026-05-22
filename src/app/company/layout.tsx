import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}

export default function CompanyRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
