import { auth } from "@/lib/auth"
import { backfillDedupeKeys } from "@/lib/job-dedupe"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function POST() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }
  const processed = await backfillDedupeKeys(100)
  return Response.json({ processed })
}
