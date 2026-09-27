import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}

// /mypage 配下は求職者 (role=seeker) 専用。各ページが個別に session チェック
// している場合が多いが、company_admin / company_member / admin セッションが
// 紛れ込んだ場合に備えて layout レベルでも role を検証する
// (/admin, /company の layout と同じパターン)。
export const dynamic = "force-dynamic"

export default async function MypageRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (session?.user) {
    const role = (session.user as { role?: string }).role
    if (role && role !== "seeker") redirect("/login")
  }

  return children
}
