/**
 * 12.3 気になる: 企業ダッシュボード「気になられた」一覧。
 *
 * 自社の active 求人に対して「気になる」が押された求職者を新着順に表示。
 * 軽量な意思表示なので、企業側は「会いたい (= スカウト送信ではなく
 * メッセージで誘導)」と判断する材料に。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Eye } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "気になる候補",
}

export default async function CompanyInterestsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const interests = await prisma.jobInterest.findMany({
    where: { job: { companyId } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      createdAt: true,
      seenByCompanyAt: true,
      user: {
        select: {
          id: true,
          name: true,
          prefecture: true,
          city: true,
          desiredCategories: true,
        },
      },
      job: {
        select: { id: true, title: true, category: true, prefecture: true },
      },
    },
  })

  // 開封フラグ (簡易): 表示と同時に seenByCompanyAt を打つ (非同期)
  const unseenIds = interests
    .filter((i) => !i.seenByCompanyAt)
    .map((i) => ({ userId: i.user.id, jobId: i.job.id }))
  if (unseenIds.length > 0) {
    void prisma.jobInterest
      .updateMany({
        where: {
          OR: unseenIds.map(({ userId, jobId }) => ({ userId, jobId })),
        },
        data: { seenByCompanyAt: new Date() },
      })
      .catch(() => {})
  }

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Eye className="h-6 w-6 text-purple-500" />
        気になる候補
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        あなたの求人に「気になる」を押した求職者一覧です。
        積極的にメッセージを送ることで応募につながる可能性があります。
      </p>

      {interests.length === 0 ? (
        <div className="mt-6 border bg-warm-50 p-6 text-center text-sm text-gray-600">
          まだ「気になる」が付いた求人はありません。
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {interests.map((i, idx) => (
            <li
              key={`${i.user.id}-${i.job.id}-${idx}`}
              className="border bg-white p-4 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  {!i.seenByCompanyAt && (
                    <span className="inline-block bg-purple-600 px-2 py-0.5 text-[10px] font-bold text-white mb-1">
                      NEW
                    </span>
                  )}
                  <p className="font-bold text-gray-900">
                    {i.user.name ?? "求職者"}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {[i.user.prefecture, i.user.city].filter(Boolean).join(" ")}
                  </p>
                  {i.user.desiredCategories.length > 0 && (
                    <p className="mt-1 text-xs text-gray-600">
                      希望: {i.user.desiredCategories.join(" / ")}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-gray-700">
                    気になる求人:{" "}
                    <Link
                      href={`/jobs/${i.job.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {i.job.title}
                    </Link>
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {i.createdAt.toLocaleString("ja-JP")}
                  </p>
                  <Link
                    href={`/company/scouts/new?userId=${i.user.id}&jobId=${i.job.id}`}
                    className="inline-flex items-center gap-1 bg-primary-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-primary-700"
                  >
                    スカウト送信
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
