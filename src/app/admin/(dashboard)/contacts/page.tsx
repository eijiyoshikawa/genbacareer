import { prisma } from "@/lib/db"
import Link from "next/link"
import type { Metadata } from "next"
import { MarkHandledButton } from "./actions"

export const metadata: Metadata = {
  title: "お問い合わせ一覧",
}

type Props = {
  searchParams: Promise<{ page?: string; handled?: string }>
}

export default async function AdminContactsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const handled = params.handled ?? "open"
  const perPage = 30

  const where =
    handled === "open"
      ? { handledAt: null }
      : handled === "done"
        ? { handledAt: { not: null } }
        : {}

  const [items, total] = await Promise.all([
    prisma.contactMessage.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.contactMessage.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">お問い合わせ一覧</h1>
      <p className="mt-1 text-sm text-gray-500">{total} 件</p>

      <div className="mt-4 flex gap-2">
        {[
          { value: "open", label: "未対応" },
          { value: "done", label: "対応済み" },
          { value: "all", label: "すべて" },
        ].map((opt) => (
          <Link
            key={opt.value}
            href={`/admin/contacts?handled=${opt.value}`}
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              handled === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">お問い合わせはありません。</p>
          </div>
        ) : (
          items.map((c) => (
            <div
              key={c.id}
              className={`rounded-lg border bg-white p-5 shadow-sm ${
                c.handledAt ? "opacity-70" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">
                    {c.name}{" "}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      &lt;{c.email}&gt;
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    カテゴリ: {c.category} —{" "}
                    {c.createdAt.toLocaleString("ja-JP")}
                  </p>
                </div>
                <MarkHandledButton id={c.id} handled={!!c.handledAt} />
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">
                {c.body}
              </p>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/contacts?handled=${handled}&page=${p}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
