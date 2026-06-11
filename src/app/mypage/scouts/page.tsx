/**
 * 12.x スカウト受信トレイ。
 *
 * 求職者本人宛のスカウト一覧を新しい順に表示。
 * 期限切れ (expired) と辞退済み (declined) は別カードでまとめてグレー表示。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, Mail, MailOpen, Clock, XCircle } from "lucide-react"
import { isScoutEnabled } from "@/lib/feature-flags"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "スカウト受信トレイ",
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Mail }
> = {
  sent: { label: "未読", className: "bg-amber-100 text-amber-700", icon: Mail },
  read: { label: "既読", className: "bg-gray-100 text-gray-600", icon: MailOpen },
  expired: { label: "期限切れ", className: "bg-gray-100 text-gray-400", icon: Clock },
  declined: { label: "辞退済み", className: "bg-gray-100 text-gray-400", icon: XCircle },
}

export default async function ScoutsInboxPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = (session.user as { id?: string }).id
  if (!userId) redirect("/login")

  // スカウト機能は求職者 1 万人突破まで未解放
  if (!(await isScoutEnabled())) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6 lg:px-8">
        <Mail className="mx-auto h-10 w-10 text-gray-300" />
        <h1 className="mt-3 text-xl font-bold text-gray-900">
          スカウト機能は準備中です
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          まもなく、企業から直接オファーが届く機能を公開予定です。
          プロフィールを充実させて、公開に備えましょう。
        </p>
        <Link
          href="/mypage/profile"
          className="mt-5 inline-block bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
        >
          プロフィールを編集
        </Link>
      </div>
    )
  }

  const scouts = await prisma.scoutMessage.findMany({
    where: { userId },
    orderBy: [{ status: "asc" }, { sentAt: "desc" }],
    take: 100,
    select: {
      id: true,
      subject: true,
      status: true,
      sentAt: true,
      expiresAt: true,
      job: { select: { id: true, title: true, prefecture: true } },
      company: { select: { id: true, name: true, logoUrl: true } },
    },
  })

  const active = scouts.filter((s) => s.status === "sent" || s.status === "read")
  const past = scouts.filter((s) => s.status === "expired" || s.status === "declined")

  const unread = active.filter((s) => s.status === "sent").length

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-black tracking-tight text-ink-900">
          スカウト受信トレイ
        </h1>
        {unread > 0 && (
          <span className="inline-flex items-center bg-rose-500 px-2.5 py-1 text-xs font-extrabold text-white">
            未読 {unread} 件
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-gray-500">
        あなたに興味を持った企業から届いた<strong className="font-bold text-gray-700">直接オファー</strong>です。有効期限内に確認しましょう。
      </p>

      {active.length === 0 ? (
        <div className="mt-8 border border-dashed border-gray-300 bg-warm-50 p-8 text-center">
          <Mail className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">現在、有効なスカウトはありません</p>
          <p className="mt-1 text-xs text-gray-400">
            プロフィールを充実させると、スカウトが届きやすくなります。
          </p>
          <Link
            href="/mypage/profile"
            className="mt-4 inline-block bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            プロフィールを編集
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {active.map((s) => {
            const sc = STATUS_CONFIG[s.status]
            const isUnread = s.status === "sent"
            return (
              <li key={s.id}>
                <Link
                  href={`/mypage/scouts/${s.id}`}
                  className={`block border p-4 transition hover:shadow-sm ${
                    isUnread
                      ? "border-l-4 border-primary-500 border-y-warm-200 border-r-warm-200 bg-primary-50/40 hover:border-primary-600"
                      : "border-warm-200 bg-white hover:border-primary-500"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* 企業ロゴ（無ければイニシャル/アイコン） */}
                    <div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden bg-gray-100">
                      {s.company?.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.company.logoUrl}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Building2 className="h-5 w-5 text-gray-400" />
                      )}
                      {isUnread && (
                        <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold ${sc.className}`}>
                          {sc.label}
                        </span>
                        <span className="text-xs text-gray-500">
                          有効期限 {formatDate(s.expiresAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate font-bold text-ink-900">
                        {s.company?.name ?? "企業"} があなたをスカウト
                      </p>
                      {s.subject && (
                        <p className="truncate text-sm font-medium text-gray-800">
                          {s.subject}
                        </p>
                      )}
                      <p className="truncate text-sm text-gray-600">
                        <Building2 className="inline-block h-3.5 w-3.5 align-text-bottom" />{" "}
                        {s.job?.title ?? "求人情報"}
                      </p>
                    </div>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      {past.length > 0 && (
        <details className="mt-8 group">
          <summary className="cursor-pointer text-sm text-gray-500">
            過去のスカウト ({past.length} 件) を表示
          </summary>
          <ul className="mt-3 space-y-2">
            {past.map((s) => {
              const sc = STATUS_CONFIG[s.status]
              return (
                <li key={s.id}>
                  <Link
                    href={`/mypage/scouts/${s.id}`}
                    className="block border border-warm-200 bg-warm-50 p-3 text-sm text-gray-500 hover:border-gray-400"
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 text-xs ${sc.className}`}>
                      {sc.label}
                    </span>{" "}
                    <span className="ml-2">{s.company?.name ?? "企業"}</span>
                    <span className="ml-2 text-gray-400">— {s.job?.title}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </div>
  )
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
    .getDate()
    .toString()
    .padStart(2, "0")}`
}
