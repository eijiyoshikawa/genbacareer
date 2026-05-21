/**
 * 11.5 縦スワイプ求人フィード (TikTok 風)。
 *
 * Server Component で初期 10 件を取得し、Client の FeedSwiper に渡す。
 * 追加読み込みは /api/jobs/feed?cursor=... で行う。
 *
 * 1 画面 1 求人のフルスクリーンビュー。
 * 上下スワイプ (= scroll-snap) で次/前の求人へ。
 */

import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { FeedSwiper, type FeedJob } from "./feed-swiper"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"

// ビルド時 prerender をスキップ。
// Supabase 接続プールが build フェーズで枯渇し P2024 で失敗するのを回避
// (sitemap.ts と同じパターン)。ユーザーが /jobs/feed を開いた時に初回生成。
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "求人フィード",
  description: "スワイプで気になる求人を発見。ゲンバキャリアのフィード機能。",
}

const INITIAL_LIMIT = 10

export default async function JobFeedPage() {
  // 求職者ログイン時のみ全件閲覧可。未ログインは GUEST_LIMIT (15) 件で打ち切り。
  // 追加読み込み API も 401 を返すので、それ以上スワイプしても求人は出ない。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id
  const initialLimit = loggedIn ? INITIAL_LIMIT : GUEST_LIMIT

  const jobs = await prisma.job.findMany({
    where: { status: "active" },
    orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
    take: initialLimit,
    select: {
      id: true,
      title: true,
      prefecture: true,
      city: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      employmentType: true,
      category: true,
      tags: true,
      description: true,
      company: {
        select: { name: true, logoUrl: true, photos: true },
      },
    },
  })

  const initial: FeedJob[] = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    prefecture: j.prefecture,
    city: j.city,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    salaryType: j.salaryType,
    employmentType: j.employmentType,
    category: j.category,
    tags: j.tags,
    description: j.description,
    companyName: j.company?.name ?? null,
    companyLogoUrl: j.company?.logoUrl ?? null,
    companyPhoto: j.company?.photos?.[0] ?? null,
  }))

  return (
    <div className="bg-black">
      <FeedSwiper initialJobs={initial} />
    </div>
  )
}
