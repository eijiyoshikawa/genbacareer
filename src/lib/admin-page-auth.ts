import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

/**
 * /admin 配下の page.tsx 冒頭で呼ぶ管理者ガード。
 *
 * layout.tsx のチェックだけに頼ると、RSC の部分レンダリング
 * (Next-Router-State-Tree で page セグメントのみ refetch) では layout が
 * 実行されず page だけが描画されうる。middleware は Cookie の有無しか
 * 見ていないため、各 page 自身でも role を検証する。
 */
export async function requireAdminPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "admin") redirect("/")
  return session
}
