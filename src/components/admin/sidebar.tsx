"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Bot,
  Shield,
  Briefcase,
  Users,
  Mail,
} from "lucide-react"

const navItems = [
  { href: "/admin", label: "ダッシュボード", icon: LayoutDashboard, exact: true },
  { href: "/admin/companies", label: "企業管理", icon: Building2 },
  { href: "/admin/jobs", label: "求人モデレーション", icon: Briefcase },
  { href: "/admin/users", label: "ユーザー", icon: Users },
  { href: "/admin/contacts", label: "お問い合わせ", icon: Mail },
  { href: "/admin/billing", label: "課金管理", icon: CreditCard },
  { href: "/admin/crawler", label: "クローラー", icon: Bot },
]

export function AdminSidebar({ userName }: { userName: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-full shrink-0 lg:w-56">
      <div className="rounded-lg border bg-white shadow-sm">
        <div className="border-b p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
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
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition ${
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
