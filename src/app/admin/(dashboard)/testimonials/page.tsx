import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { TestimonialsManager } from "./testimonials-manager"

export const metadata: Metadata = {
  title: "体験談（利用者の声）管理",
}

export default async function AdminTestimonialsPage() {
  const rows = await prisma.testimonial.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      quote: true,
      who: true,
      published: true,
      sortOrder: true,
      createdAt: true,
    },
  })

  const items = rows.map((r) => ({
    id: r.id,
    quote: r.quote,
    who: r.who,
    published: r.published,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          体験談（利用者の声）管理
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          TOP ページの「VOICE」セクションに、公開中の体験談が表示順（小さいほど上）で最大 3 件表示されます。
          公開中が 0 件の場合はサンプルが表示されます。
        </p>
      </div>

      <TestimonialsManager initialItems={items} />
    </div>
  )
}
