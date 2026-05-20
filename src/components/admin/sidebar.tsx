"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Bot,
  Shield,
  FileText,
  MessageCircle,
  BarChart3,
  Send,
  FileStack,
  History,
  Activity,
  ShieldCheck,
  Database,
  Search,
  Flag,
  Sparkles,
} from "lucide-react"

const navItems = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
  { href: "/admin/status", label: "システム状態", icon: Activity },
  { href: "/admin/analytics", label: "分析", icon: BarChart3 },
  { href: "/admin/reports", label: "通報", icon: Flag },
  { href: "/admin/line-leads", label: "LINE リード", icon: MessageCircle },
  { href: "/admin/segments", label: "セグメント配信", icon: Send },
  { href: "/admin/companies", label: "企業管理", icon: Building2 },
  { href: "/admin/articles", label: "記事管理", icon: FileText },
  { href: "/admin/job-templates", label: "求人テンプレ", icon: FileStack },
  { href: "/admin/job-quality", label: "求人精査", icon: ShieldCheck },
  { href: "/admin/categorize-preview", label: "カテゴリ判定テスト", icon: Sparkles },
  { href: "/admin/hellowork-stats", label: "HW 取込統計", icon: Database },
  { href: "/admin/search-logs", label: "検索ログ", icon: Search },
  { href: "/admin/billing", label: "課金管理", icon: CreditCard },
  { href: "/admin/audit-log", label: "監査ログ", icon: History },
  { href: "/admin/crawler", label: "クローラー", icon: Bot },
]

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="border bg-white shadow-sm">
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center bg-red-100">
              <Shield className="h-5 w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                {userName}
              </p>
              <p className="text-xs text-gray-500">管理者</p>
            </div>
          </div>
        </div>

        <nav className="p-2">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3  px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-red-50 text-red-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </aside>
  )
}
