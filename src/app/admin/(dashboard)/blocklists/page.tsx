/**
 * 8.1 除外キーワード GUI 管理。
 *
 * クローラ取り込み時の除外フィルタを admin がメンテナンスする画面。
 * keyword + scope (any/title/description/company) + enabled トグル。
 *
 * 実際の判定は別途 lib/blocklist-match.ts と クローラ取り込み側で使う想定。
 */

import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { Ban } from "lucide-react"
import { BlocklistTable } from "./blocklist-table"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "除外キーワード管理",
}

export default async function BlocklistsPage() {
  const items = await prisma.blocklist
    .findMany({
      orderBy: [{ enabled: "desc" }, { updatedAt: "desc" }],
      take: 200,
    })
    .catch(() => [])

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Ban className="h-6 w-6 text-red-500" />
        除外キーワード管理
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        クローラ取り込み時に、ここに登録したキーワードを含む求人を自動的に除外します。
        詐欺求人や法令違反求人のフィルタとして利用。
      </p>

      <div className="mt-6">
        <BlocklistTable
          items={items.map((b) => ({
            id: b.id,
            keyword: b.keyword,
            scope: b.scope,
            note: b.note,
            enabled: b.enabled,
            hitCount: b.hitCount,
            updatedAt: b.updatedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}
