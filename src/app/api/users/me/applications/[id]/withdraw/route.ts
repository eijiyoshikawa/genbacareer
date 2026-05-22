/**
 * POST /api/users/me/applications/[id]/withdraw
 *
 * 求職者による応募の取り消し。条件:
 *   - 自分の応募であること
 *   - createdAt から 24 時間以内
 *   - 現在の status が "applied" or "reviewing" であること
 *     (interview / offered / hired / rejected 以降は取り消し不可)
 *
 * 取り消し時:
 *   - Application.status = "withdrawn"
 *   - statusHistory に追記
 *   - 企業側通知（既存の通知レイヤがあれば連動。なくても DB のみで OK）
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const WITHDRAW_WINDOW_MS = 24 * 60 * 60 * 1000
const WITHDRAWABLE_STATUSES = ["applied", "reviewing"] as const

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const userId = session.user.id

  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return Response.json({ error: "Invalid id" }, { status: 400 })
  }

  const app = await prisma.application
    .findUnique({
      where: { id },
      select: {
        userId: true,
        status: true,
        createdAt: true,
        statusHistory: true,
      },
    })
    .catch(() => null)

  if (!app || app.userId !== userId) {
    return Response.json(
      { error: "応募が見つかりません" },
      { status: 404 }
    )
  }

  if (!WITHDRAWABLE_STATUSES.includes(app.status as (typeof WITHDRAWABLE_STATUSES)[number])) {
    return Response.json(
      {
        error: "選考が進行している応募は取り消しできません。お手数ですが企業にご連絡ください。",
      },
      { status: 409 }
    )
  }

  if (Date.now() - app.createdAt.getTime() > WITHDRAW_WINDOW_MS) {
    return Response.json(
      {
        error: "応募から 24 時間を超えたため、本サイトから取り消しできません。お手数ですが企業にご連絡ください。",
      },
      { status: 409 }
    )
  }

  const history = Array.isArray(app.statusHistory) ? app.statusHistory : []
  await prisma.application.update({
    where: { id },
    data: {
      status: "withdrawn",
      statusHistory: [
        ...history,
        {
          from: app.status,
          to: "withdrawn",
          at: new Date().toISOString(),
          by: "seeker",
        },
      ],
    },
  })

  return Response.json({ ok: true })
}
