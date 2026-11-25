/**
 * LINE 応募 (line_leads) の「運用メモ」= 運営だけが読み書きする内部メモ。
 *
 * 以前は運営のメモを応募者本人の入力欄と同じ `notes` 列に上書き保存していた。
 * `notes` は企業の管理画面 (/company/line-leads) にそのまま表示されるため、
 * 運営の内部メモ (折り返し状況・ヒアリング内容など) が求人企業に見えており、
 * 応募者が書いた本文も上書きで失われていた。
 *
 * 専用の `admin_notes` 列に分ける。この列は Prisma のモデルには載せず生 SQL で
 * 読み書きする: モデルに載せると、列がまだ無い DB では応募の登録
 * (lineLead.create) まで失敗するようになり、メモ機能の不具合が応募受付の
 * 停止に広がってしまうため。列が無ければ初回の保存時に作る。
 */
import { prisma } from "@/lib/db"

const ADD_COLUMN_SQL =
  'ALTER TABLE "line_leads" ADD COLUMN IF NOT EXISTS "admin_notes" TEXT'

function isMissingColumnError(e: unknown): boolean {
  const message = e instanceof Error ? e.message : String(e)
  return /admin_notes/.test(message) && /42703|does not exist/i.test(message)
}

/** 運用メモを保存する。対象の行が無ければ false。 */
export async function setLeadAdminNotes(
  id: string,
  notes: string | null
): Promise<boolean> {
  const run = () =>
    prisma.$executeRaw`UPDATE "line_leads" SET "admin_notes" = ${notes}, "updated_at" = now() WHERE "id" = ${id}::uuid`
  try {
    return (await run()) > 0
  } catch (e) {
    if (!isMissingColumnError(e)) throw e
    await prisma.$executeRawUnsafe(ADD_COLUMN_SQL)
    return (await run()) > 0
  }
}

/** id → 運用メモ。列が無い・取得に失敗した場合は空の Map (画面は表示できる)。 */
export async function getLeadAdminNotes(
  ids: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  if (ids.length === 0) return result
  try {
    const rows = await prisma.$queryRaw<
      { id: string; admin_notes: string | null }[]
    >`SELECT "id"::text AS id, "admin_notes" FROM "line_leads" WHERE "id" = ANY(${ids}::uuid[]) AND "admin_notes" IS NOT NULL`
    for (const r of rows) {
      if (r.admin_notes) result.set(r.id, r.admin_notes)
    }
  } catch (e) {
    if (!isMissingColumnError(e)) {
      console.warn(
        `[line-lead-admin-notes] read failed: ${e instanceof Error ? e.message : e}`
      )
    }
  }
  return result
}
