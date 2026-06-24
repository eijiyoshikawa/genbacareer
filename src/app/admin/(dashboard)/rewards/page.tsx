import { prisma } from "@/lib/db"
import { POINT_RULES } from "@/lib/points"
import {
  InterviewAwardForm,
  PrizeCreateForm,
  PrizeToggle,
  FulfillButton,
} from "@/components/admin/rewards-admin"

export const dynamic = "force-dynamic"

const KIND_LABELS: Record<string, string> = {
  amazon_gift: "金券",
  service_perk: "特典",
  physical: "実物",
  none: "ハズレ",
}

function fmt(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d)
}

export default async function AdminRewardsPage() {
  const [prizes, pendingDraws, stats] = await Promise.all([
    prisma.lotteryPrize.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    prisma.lotteryDraw.findMany({
      where: { isWin: true, fulfillment: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.lotteryDraw.count(),
  ])

  const totalWeight = prizes
    .filter((p) => p.active && (p.stock === null || p.stock > 0))
    .reduce((s, p) => s + Math.max(0, p.weight), 0)

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">ポイント・抽選 管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        付与ルール: 閲覧 +{POINT_RULES.viewJob}pt/件（1日上限 {POINT_RULES.viewJobDailyCap}pt）/
        面談 +{POINT_RULES.careerInterview}pt/回 / 抽選 {POINT_RULES.lotteryCost}pt（1日 {POINT_RULES.lotteryDailyCap} 回まで）/
        累計抽選回数 {stats}
      </p>

      <div className="mt-6 space-y-6">
        <InterviewAwardForm />
        <PrizeCreateForm />

        {/* 景品一覧 */}
        <section>
          <h2 className="text-base font-bold text-gray-900">景品一覧</h2>
          <div className="mt-2 overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">景品名</th>
                  <th className="px-3 py-2">種別</th>
                  <th className="px-3 py-2">景品額</th>
                  <th className="px-3 py-2">重み</th>
                  <th className="px-3 py-2">当選確率</th>
                  <th className="px-3 py-2">在庫</th>
                  <th className="px-3 py-2">状態</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {prizes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-4 text-center text-gray-400">
                      景品が未登録です
                    </td>
                  </tr>
                ) : (
                  prizes.map((p) => {
                    const eligible = p.active && (p.stock === null || p.stock > 0)
                    const prob =
                      eligible && totalWeight > 0
                        ? ((Math.max(0, p.weight) / totalWeight) * 100).toFixed(1) + "%"
                        : "—"
                    return (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                        <td className="px-3 py-2 text-gray-600">{KIND_LABELS[p.kind] ?? p.kind}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {p.valueJpy > 0 ? `${p.valueJpy.toLocaleString()}円` : "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{p.weight}</td>
                        <td className="px-3 py-2 text-gray-600">{prob}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {p.stock === null ? "無制限" : p.stock}
                        </td>
                        <td className="px-3 py-2">
                          <PrizeToggle id={p.id} active={p.active} />
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 引き渡し待ちの当選 */}
        <section>
          <h2 className="text-base font-bold text-gray-900">
            引き渡し待ちの当選（金券・実物）
          </h2>
          <div className="mt-2 overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500">
                <tr>
                  <th className="px-3 py-2">日時</th>
                  <th className="px-3 py-2">当選者</th>
                  <th className="px-3 py-2">景品</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {pendingDraws.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400">
                      引き渡し待ちはありません
                    </td>
                  </tr>
                ) : (
                  pendingDraws.map((d) => (
                    <tr key={d.id}>
                      <td className="px-3 py-2 text-gray-500">{fmt(d.createdAt)}</td>
                      <td className="px-3 py-2 text-gray-700">
                        {d.user?.name ?? "—"}
                        <span className="block text-xs text-gray-400">{d.user?.email}</span>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-800">{d.prizeName}</td>
                      <td className="px-3 py-2 text-right">
                        <FulfillButton id={d.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}
