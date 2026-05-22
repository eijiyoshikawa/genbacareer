/**
 * HelloWork 取り込み進捗の確認・操作 Admin API
 *
 * GET  /api/admin/hellowork/progress
 *   全 dataId の進捗を返す
 *
 * POST /api/admin/hellowork/progress?action=sync
 *   API から dataId 一覧を取得して進捗テーブルに不足分を追加する
 *
 * POST /api/admin/hellowork/progress?action=reset[&dataId=Mxxx]
 *   進捗をリセット（dataId 指定がなければ全件）
 *
 * 認証: Bearer ADMIN_API_KEY
 */

import { type NextRequest } from "next/server"
import { syncDataIds } from "@/lib/crawler/rotation-planner"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

function authenticate(request: NextRequest): boolean {
  const apiKey = process.env.ADMIN_API_KEY
  if (!apiKey) return false
  const auth = request.headers.get("authorization")
  if (!auth) return false
  const [scheme, token] = auth.split(" ")
  return scheme?.toLowerCase() === "bearer" && token === apiKey
}

export async function GET(request: NextRequest) {
  if (!authenticate(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const rows = await prisma.importProgress.findMany({
    where: { source: "hellowork" },
    orderBy: { dataId: "asc" },
  })
  const summary = {
    totalDataIds: rows.length,
    exhausted: rows.filter((r) => r.exhausted).length,
    inProgress: rows.filter((r) => !r.exhausted && r.lastPage > 0).length,
    notStarted: rows.filter((r) => !r.exhausted && r.lastPage === 0).length,
    totalFetched: rows.reduce((s, r) => s + r.totalFetched, 0),
  }
  return Response.json({ success: true, summary, rows })
}

export async function POST(request: NextRequest) {
  if (!authenticate(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const action = url.searchParams.get("action")

  if (action === "sync") {
    const result = await syncDataIds(prisma)
    return Response.json({ success: true, action, ...result })
  }

  if (action === "reset") {
    const dataId = url.searchParams.get("dataId")
    const where = dataId
      ? { source: "hellowork", dataId }
      : { source: "hellowork" }
    const result = await prisma.importProgress.updateMany({
      where,
      data: { lastPage: 0, exhausted: false, totalFetched: 0 },
    })
    return Response.json({ success: true, action, updated: result.count })
  }

  return Response.json(
    { success: false, error: "action は 'sync' または 'reset' を指定してください" },
    { status: 400 }
  )
}
