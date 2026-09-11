/**
 * PATCH /api/admin/users/[id] — User の status を変更（admin 専用）
 *
 * 対応 status: active | suspended | deleted
 * - suspended 化時は suspendedAt + suspendedReason を記録
 * - active 戻しは suspended 系を null クリア
 * - deleted は実質的に soft delete（個人情報匿名化は退会フロー側で実施済の想定）
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { logAudit } from "@/lib/audit-log"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const schema = z.object({
  status: z.enum(["active", "suspended"]),
  reason: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth().catch(() => null)
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user?.id || role !== "admin") {
    return Response.json({ error: "管理者権限が必要です" }, { status: 403 })
  }

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "入力内容に誤りがあります" }, { status: 400 })
  }

  const updates =
    parsed.data.status === "suspended"
      ? {
          status: "suspended" as const,
          suspendedAt: new Date(),
          suspendedReason: parsed.data.reason ?? null,
        }
      : {
          status: "active" as const,
          suspendedAt: null,
          suspendedReason: null,
        }

  // 更新失敗を握りつぶさない。以前は catch でログのみ出して処理を続行して
  // いたため、対象が存在しない/DB エラー等で実際には凍結されていない
  // のに、監査ログには「凍結しました」と記録され admin UI にも成功表示
  // される状態になっていた。
  try {
    await prisma.user.update({ where: { id }, data: updates })
  } catch (e) {
    console.error("[admin/users/PATCH] failed:", e)
    return Response.json(
      { error: "ユーザーの更新に失敗しました" },
      { status: 500 }
    )
  }

  // 監査ログ（共通ヘルパー経由に統一。以前はここだけ独自に prisma.auditLog.create
  // を直書きしており、書き込み失敗時も logAudit() のような警告ログすら残らず
  // 完全に無音で握り潰されていた）。
  void logAudit({
    actorType: "admin",
    actorId: session.user.id,
    actorEmail: session.user.email ?? null,
    action: parsed.data.status === "suspended" ? "user.suspend" : "user.unsuspend",
    resourceType: "user",
    resourceId: id,
    summary:
      parsed.data.status === "suspended"
        ? `User suspended${parsed.data.reason ? `: ${parsed.data.reason}` : ""}`
        : "User unsuspended",
    diff: parsed.data.reason ? { reason: parsed.data.reason } : undefined,
  })

  return Response.json({ ok: true })
}
