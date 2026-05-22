/**
 * 監査ログ書き込みヘルパー。
 *
 * 重要操作の DB 行を AuditLog に記録する。fire-and-forget で
 * 失敗してもアプリケーションのフローは止めない。
 */

import { prisma } from "@/lib/db"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"

export type AuditActorType = "admin" | "company_user" | "system" | "user"

export type AuditEvent = {
  actorType: AuditActorType
  actorId?: string | null
  actorEmail?: string | null
  resourceType: string
  resourceId?: string | null
  action: string
  summary?: string | null
  diff?: unknown
}

/**
 * 1 件の監査イベントを記録する。
 * - 現在の request の IP / UA を可能なら自動取得（next/headers）
 */
export async function logAudit(event: AuditEvent): Promise<void> {
  let ipAddress: string | null = null
  let userAgent: string | null = null
  try {
    const h = await headers()
    const fwd = h.get("x-forwarded-for")
    ipAddress = fwd ? fwd.split(",")[0].trim() : null
    userAgent = h.get("user-agent")
  } catch {
    // server actions の外（cron 等）では headers() が使えないので無視
  }
  try {
    await prisma.auditLog.create({
      data: {
        actorType: event.actorType,
        actorId: event.actorId ?? null,
        actorEmail: event.actorEmail ?? null,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        action: event.action,
        summary: event.summary ?? null,
        diff: (event.diff ?? undefined) as never,
        ipAddress,
        userAgent,
      },
    })
  } catch (e) {
    console.warn(`[audit-log] failed: ${e instanceof Error ? e.message : e}`)
  }
}

/**
 * 現在のセッションから actor 情報を組み立てる便利ヘルパー。
 * 未ログインの場合は actorType="system" を返す。
 */
export async function buildActorFromSession(): Promise<{
  actorType: AuditActorType
  actorId: string | null
  actorEmail: string | null
}> {
  const session = await auth().catch(() => null)
  if (!session?.user) {
    return { actorType: "system", actorId: null, actorEmail: null }
  }
  const role = (session.user as { role?: string }).role
  if (role === "admin") {
    return {
      actorType: "admin",
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: session.user.email ?? null,
    }
  }
  if (role === "company_admin" || role === "company_member") {
    return {
      actorType: "company_user",
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: session.user.email ?? null,
    }
  }
  return {
    actorType: "user",
    actorId: (session.user as { id?: string }).id ?? null,
    actorEmail: session.user.email ?? null,
  }
}
