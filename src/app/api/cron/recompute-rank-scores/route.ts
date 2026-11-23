import { prisma } from "@/lib/db"
import { computeRankScore } from "@/lib/ranking"

/**
 * 鮮度シグナルを反映するための rankScore 日次再計算。
 *
 * rankScore は通常「企業プロフィール更新時 / 取込時」にしか計算されないため、
 * 新着加点(+15/+8) や期限間近ペナルティ(-10/-20) などの時間依存シグナルが
 * 古い値のまま固定されてしまう。本 cron は「今その時間シグナルが効いている
 * 求人」だけを対象に毎日再計算し、鮮度を正しく順位へ反映する。
 *
 * 対象: status=active かつ（公開 14 日以内 OR 期限 14 日以内）
 *   - 公開 14 日以内 … 新着加点の付与/減衰を反映（7 日を跨いだ求人の +15 を解消）
 *   - 期限 14 日以内 … 期限ペナルティの付与を反映
 *
 * Authorization: Bearer ${CRON_SECRET}（未設定時も拒否）
 */

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const BATCH_SIZE = 500
const UPDATE_CONCURRENCY = 25
const MAX_JOBS = 40000 // 1 実行あたりの上限（タイムアウト保護）
const WINDOW_MS = 14 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const publishedSince = new Date(now.getTime() - WINDOW_MS)
  const expiresBefore = new Date(now.getTime() + WINDOW_MS)

  const where = {
    status: "active" as const,
    OR: [
      { publishedAt: { gte: publishedSince } },
      { expiresAt: { lte: expiresBefore } },
    ],
  }

  let cursor: string | undefined
  let scanned = 0
  let updated = 0

  try {
    while (scanned < MAX_JOBS) {
      const batch = await prisma.job.findMany({
        where,
        select: {
          id: true,
          rankScore: true,
          description: true,
          requirements: true,
          salaryMin: true,
          salaryMax: true,
          employmentType: true,
          workHours: true,
          holidays: true,
          insurance: true,
          bonus: true,
          commuteAllowance: true,
          companyFeatures: true,
          businessContent: true,
          publishedAt: true,
          expiresAt: true,
          viewCount: true,
          company: {
            select: {
              tagline: true,
              pitchHighlights: true,
              idealCandidate: true,
              employeeVoice: true,
              photos: true,
              instagramUrl: true,
              tiktokUrl: true,
              facebookUrl: true,
              xUrl: true,
              youtubeUrl: true,
              lastContentUpdatedAt: true,
            },
          },
        },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      })
      if (batch.length === 0) break

      const updates: Array<{ id: string; newScore: number }> = []
      for (const job of batch) {
        scanned++
        const newScore = computeRankScore(job, job.company, now)
        if (newScore !== job.rankScore) {
          updates.push({ id: job.id, newScore })
        }
      }

      for (let i = 0; i < updates.length; i += UPDATE_CONCURRENCY) {
        const chunk = updates.slice(i, i + UPDATE_CONCURRENCY)
        await Promise.all(
          chunk.map((u) =>
            prisma.job
              .update({ where: { id: u.id }, data: { rankScore: u.newScore } })
              .catch(() => null)
          )
        )
        updated += chunk.length
      }

      cursor = batch[batch.length - 1].id
      if (batch.length < BATCH_SIZE) break
    }

    return Response.json({ ok: true, scanned, updated })
  } catch (e) {
    return Response.json(
      { ok: false, scanned, updated, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
