import Link from "next/link"
import { CalendarClock, ExternalLink, Star } from "lucide-react"
import type { SchedulingUrl } from "@/lib/scheduling-urls"

/**
 * 応募者詳細ページに置く、企業の調整ツール URL クイックアクセスパネル。
 * 担当者がワンクリックで予約画面を開いて求職者に送れる。
 */
export function SchedulingUrlsPanel({
  urls,
}: {
  urls: SchedulingUrl[]
}) {
  if (urls.length === 0) {
    return (
      <section className="border bg-warm-50 p-4 text-xs text-gray-500">
        <p className="flex items-center gap-1.5 font-bold text-gray-700">
          <CalendarClock className="h-4 w-4" />
          面接調整ツール
        </p>
        <p className="mt-1">
          <Link
            href="/company/profile"
            className="text-primary-700 hover:underline"
          >
            企業プロフィール
          </Link>{" "}
          で Google Calendar / Calendly / 役員専用 URL などを登録すると、ここからワンクリック起動できます。
        </p>
      </section>
    )
  }

  return (
    <section className="border bg-white p-4 shadow-sm">
      <p className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
        <CalendarClock className="h-4 w-4 text-primary-600" />
        面接調整ツール
      </p>
      <ul className="mt-2 divide-y">
        {urls.map((u, i) => (
          <li key={`${u.url}-${i}`}>
            <a
              href={u.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 py-2 text-sm hover:text-primary-700"
            >
              {u.primary && (
                <Star
                  className="h-3 w-3 text-amber-500 shrink-0"
                  fill="currentColor"
                />
              )}
              <span className="flex-1 min-w-0 truncate">{u.name}</span>
              <ExternalLink className="h-3 w-3 text-gray-400 shrink-0" />
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-gray-500">
        ★ はメインに設定されたツールです。
      </p>
    </section>
  )
}
