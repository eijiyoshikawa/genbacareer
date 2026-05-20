"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { FileText, Megaphone, Bell } from "lucide-react"

type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  linkUrl: string | null
  createdAt: string
  readAt: string | null
}

const ICON_BY_TYPE: Record<string, typeof Bell> = {
  application_status: FileText,
  promo: Megaphone,
  system: Bell,
}

export function NotificationList({ items }: { items: NotificationItem[] }) {
  const router = useRouter()
  const [optimisticRead, setOptimisticRead] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  async function markRead(id: string) {
    if (optimisticRead.has(id)) return
    setOptimisticRead((s) => new Set(s).add(id))
    try {
      await fetch(`/api/users/me/notifications/${id}/read`, { method: "POST" })
    } catch {
      // ignore — UI 既読のみで充分
    }
  }

  async function handleClick(item: NotificationItem) {
    if (!item.readAt) await markRead(item.id)
    if (item.linkUrl) {
      startTransition(() => {
        router.push(item.linkUrl as string)
      })
    } else {
      // 一覧をリロードして既読を反映
      router.refresh()
    }
  }

  return (
    <ul className="mt-6 divide-y border bg-white">
      {items.map((item) => {
        const Icon = ICON_BY_TYPE[item.type] ?? Bell
        const isUnread = !item.readAt && !optimisticRead.has(item.id)
        return (
          <li key={item.id}>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleClick(item)}
              className={`group flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 disabled:opacity-60 ${
                isUnread ? "bg-primary-50/40" : ""
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center ${
                  isUnread ? "bg-primary-100" : "bg-gray-100"
                }`}
              >
                <Icon
                  className={`h-4 w-4 ${
                    isUnread ? "text-primary-700" : "text-gray-500"
                  }`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p
                    className={`text-sm ${
                      isUnread ? "font-bold text-gray-900" : "text-gray-700"
                    }`}
                  >
                    {isUnread && (
                      <span
                        aria-label="未読"
                        className="mr-1 inline-block h-2 w-2 rounded-full bg-primary-600 align-middle"
                      />
                    )}
                    {item.title}
                  </p>
                  <time
                    dateTime={item.createdAt}
                    className="shrink-0 text-xs text-gray-500"
                  >
                    {formatRelative(new Date(item.createdAt))}
                  </time>
                </div>
                {item.body && (
                  <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                    {item.body}
                  </p>
                )}
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function formatRelative(d: Date): string {
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "たった今"
  if (min < 60) return `${min} 分前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 時間前`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day} 日前`
  return d.toLocaleDateString("ja-JP")
}
