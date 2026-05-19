import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { ScoutTemplatesManager } from "@/components/company/scout-templates-manager"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "スカウトテンプレート",
}

export default async function ScoutTemplatesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  let templates: Array<{
    id: string
    name: string
    body: string
    updatedAt: Date
  }> = []
  try {
    templates = await prisma.scoutTemplate.findMany({
      where: { companyId },
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
      select: { id: true, name: true, body: true, updatedAt: true },
    })
  } catch (e) {
    // テーブル未作成時のフォールバック (初回デプロイ直後)
    console.warn("[scout-templates] table not ready:", e instanceof Error ? e.message : e)
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">スカウトテンプレート</h1>
        <p className="mt-1 text-sm text-gray-500">
          よく使うスカウト文章を保存して、スカウト送信時にワンクリックで挿入できます。
        </p>
      </header>

      <ScoutTemplatesManager
        initialTemplates={templates.map((t) => ({
          id: t.id,
          name: t.name,
          body: t.body,
          updatedAt: t.updatedAt.toISOString(),
        }))}
      />
    </div>
  )
}
