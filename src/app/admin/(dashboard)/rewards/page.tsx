import { prisma } from "@/lib/db"
import { POINT_RULES } from "@/lib/points"
import {
  InterviewAwardForm,
  PrizeCreateForm,
  PrizeToggle,
  FulfillButton,
  GiftCodeUpload,
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
  const [prizes, pendingDraws, stats, codeAvail, codeTotal] = await Promise.all([
    prisma.lotteryPrize.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    prisma.lotteryDraw.findMany({
      where: { isWin: true, fulfillment: "pending" },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.lotteryDraw.count(),
    prisma.giftCode.groupBy({
      by: ["prizeId"],
      where: { status: "available" },
      _count: true,
    }),
    prisma.giftCode.groupBy({ by: ["prizeId"], _count: true }),
  ])

  const availByPrize = new Map(codeAvail.map((c) => [c.prizeId, c._count]))
  const totalByPrize = new Map(codeTotal.map((c) => [c.prizeId, c._count]))

  // amazon_gift は「未割当コード枚数」を在庫とみなして抽選対象か判定する
  const isEligible = (p: (typeof prizes)[number]): boolean => {
    if (!p.active) return false
    if (p.kind === "amazon_gift") return (availByPrize.get(p.id) ?? 0) > 0
    return p.stock === null || p.stock > 0
  }
  const totalWeight = prizes
    .filter(isEligible)
    .reduce((s, p) => s + Math.max(0, p.weight), 0)

  const giftPrizes = prizes
    .filter((p) => p.kind === "amazon_gift")
    .map((p) => ({ id: p.id, name: p.name }))

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900">ポイント・抽選 管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        付与ルール: 初回登録 +{POINT_RULES.signupBonus}pt（上限外）/ ログイン +{POINT_RULES.loginBonus}pt（1日1回）/
        閲覧 +{POINT_RULES.viewJob}pt/件（{Math.round(POINT_RULES.viewDwellMs / 1000)}秒以上）/
        ログイン＋閲覧は1日 {POINT_RULES.dailyEarnCap}pt まで / 面談 +{POINT_RULES.careerInterview}pt（{POINT_RULES.careerInterviewCooldownDays}日に1回・同一企業不可・上限外）/
        抽選 {POINT_RULES.lotteryCost}pt（1日 {POINT_RULES.lotteryDailyCap} 回まで・当選在庫切れ時は停止）/ 累計抽選 {stats} 回
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
                    const eligible = isEligible(p)
                    const prob =
                      eligible && totalWeight > 0
                        ? ((Math.max(0, p.weight) / totalWeight) * 100).toFixed(1) + "%"
                        : "—"
                    const stockLabel =
                      p.kind === "amazon_gift"
                        ? `コード ${availByPrize.get(p.id) ?? 0}/${totalByPrize.get(p.id) ?? 0}`
                        : p.kind === "none"
                          ? "—"
                          : p.stock === null
                            ? "無制限"
                            : String(p.stock)
                    return (
                      <tr key={p.id}>
                        <td className="px-3 py-2 font-medium text-gray-800">{p.name}</td>
                        <td className="px-3 py-2 text-gray-600">{KIND_LABELS[p.kind] ?? p.kind}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {p.valueJpy > 0 ? `${p.valueJpy.toLocaleString()}円` : "—"}
                        </td>
                        <td className="px-3 py-2 text-gray-600">{p.weight}</td>
                        <td className="px-3 py-2 text-gray-600">{prob}</td>
                        <td className="px-3 py-2 text-gray-600">{stockLabel}</td>
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

        <GiftCodeUpload prizes={giftPrizes} />

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
