import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { Coins, History, Ticket, ArrowLeft } from "lucide-react"
import { getPointsSummary, REASON_LABELS } from "@/lib/points"
import { RewardsSpin } from "@/components/mypage/rewards-client"

export const metadata: Metadata = {
  title: "ポイント・抽選",
}

export const dynamic = "force-dynamic"

const KIND_LABELS: Record<string, string> = {
  amazon_gift: "金券",
  service_perk: "特典",
  physical: "実物",
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Tokyo",
  }).format(d)
}

export default async function RewardsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { balance, history, prizes, rules, canDraw } = await getPointsSummary(
    session.user.id,
  )

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/mypage"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600"
      >
        <ArrowLeft className="h-4 w-4" />
        マイページ
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-gray-900">ポイント・抽選</h1>

      {/* 残高 */}
      <div className="mt-6 flex items-center justify-between rounded-lg border bg-gradient-to-r from-primary-50 to-white p-5">
        <div className="flex items-center gap-3">
          <Coins className="h-8 w-8 text-primary-600" />
          <div>
            <p className="text-xs text-gray-500">現在のポイント</p>
            <p className="text-3xl font-extrabold text-gray-900">
              {balance.toLocaleString()}
              <span className="ml-1 text-base font-bold text-gray-500">pt</span>
            </p>
          </div>
        </div>
      </div>

      {/* 貯め方 */}
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-lg border bg-white p-4">
          <p className="font-bold text-gray-900">求人を見る</p>
          <p className="mt-1 text-gray-600">
            +{rules.viewJob} pt / 件
            <span className="block text-xs text-gray-400">
              （同一求人は 1 日 1 回・1 日 {rules.viewJobDailyCap} pt まで）
            </span>
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="font-bold text-gray-900">キャリア面談</p>
          <p className="mt-1 text-gray-600">
            +{rules.careerInterview} pt / 回
            <span className="block text-xs text-gray-400">（完了ごと）</span>
          </p>
        </div>
      </div>

      {/* 抽選 */}
      <div className="mt-6">
        <RewardsSpin cost={rules.lotteryCost} canDraw={canDraw} balance={balance} />
      </div>

      {/* 景品一覧 */}
      {prizes.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
            <Ticket className="h-5 w-5 text-gray-500" />
            抽選で当たる景品
          </h2>
          <ul className="mt-3 divide-y rounded-lg border bg-white">
            {prizes.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="font-medium text-gray-800">{p.name}</span>
                <span className="flex items-center gap-2 text-xs text-gray-500">
                  {KIND_LABELS[p.kind] ?? p.kind}
                  {p.valueJpy > 0 && (
                    <span className="rounded bg-gray-100 px-1.5 py-0.5">
                      {p.valueJpy.toLocaleString()}円相当
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-gray-400">
            ※ 景品内容・当選確率・在庫は予告なく変更される場合があります。ポイントの購入・換金・譲渡はできません。
          </p>
        </section>
      )}

      {/* 履歴 */}
      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <History className="h-5 w-5 text-gray-500" />
          ポイント履歴
        </h2>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">まだ履歴はありません。</p>
        ) : (
          <ul className="mt-3 divide-y rounded-lg border bg-white">
            {history.map((h) => (
              <li
                key={h.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span className="text-gray-700">
                  {REASON_LABELS[h.reason] ?? h.reason}
                  <span className="ml-2 text-xs text-gray-400">
                    {formatDate(h.createdAt)}
                  </span>
                </span>
                <span
                  className={`font-bold ${
                    h.delta >= 0 ? "text-emerald-600" : "text-gray-500"
                  }`}
                >
                  {h.delta >= 0 ? `+${h.delta}` : h.delta} pt
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
