import { redirect } from "next/navigation"

/**
 * /company 直下にはダッシュボード本体が無い（実体は route group 経由の
 * /company/dashboard）。ブックマークや旧リンクで /company に来た場合に
 * 404 にならないよう、ダッシュボードへ恒久リダイレクトする。
 */
export default function CompanyIndexPage() {
  redirect("/company/dashboard")
}
