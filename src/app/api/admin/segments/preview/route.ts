/**
 * GET /api/admin/segments/preview?utmSource=...&status=...&jobCategory=...&...
 *
 * セグメント条件のマッチ件数を即時返却（一括 push 前のドライラン用）。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { countSegment, isLeadStatusValue, type Segment } from "@/lib/segment"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const session = await auth().catch(() => null)
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const segment = parseSegment(request.nextUrl.searchParams)
  const { total, bound } = await countSegment(segment)
  return Response.json({ total, bound, segment })
}

function parseSegment(sp: URLSearchParams): Segment {
  const s: Segment = {}
  const utm = sp.get("utmSource")?.trim()
  if (utm) s.utmSource = utm
  const status = sp.get("status")?.trim()
  if (status && isLeadStatusValue(status)) s.status = status
  const jc = sp.get("jobCategory")?.trim()
  if (jc) s.jobCategory = jc
  const jp = sp.get("jobPrefecture")?.trim()
  if (jp) s.jobPrefecture = jp
  const vc = sp.get("viewedCategory")?.trim()
  if (vc) s.viewedCategory = vc
  const vp = sp.get("viewedPrefecture")?.trim()
  if (vp) s.viewedPrefecture = vp
  const lb = sp.get("lineBound")
  if (lb === "true") s.lineBound = true
  if (lb === "false") s.lineBound = false
  const days = Number(sp.get("createdSinceDays") ?? "")
  if (Number.isFinite(days) && days > 0) s.createdSinceDays = days
  return s
}
