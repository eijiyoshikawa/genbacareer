import { CheckCircle2, Award, Building2 } from "lucide-react"
import {
  hasGbizData,
  extractConstructionPermits,
  type GbizSnapshot,
} from "@/lib/gbizinfo"

/**
 * 企業詳細ページに GbizINFO 由来のデータを表示するセクション。
 *
 * - 建設業許可（強調表示）
 * - 設立年月日 / 資本金 / 従業員数
 * - 表彰歴（健康経営優良法人など）
 *
 * データが無ければセクション自体を表示しない。
 */
export function CompanyGbizSection({
  gbizData,
  gbizSyncedAt,
}: {
  gbizData: unknown
  gbizSyncedAt: Date | null
}) {
  if (!hasGbizData(gbizData)) return null
  const snapshot = gbizData as GbizSnapshot

  const permits = extractConstructionPermits(snapshot)
  const basic = snapshot.basic
  const commendations = snapshot.commendations

  // 表示する情報が何もなければセクション省略
  const hasAnyData =
    permits.length > 0 ||
    commendations.length > 0 ||
    !!basic?.dateOfEstablishment ||
    !!basic?.capitalStock ||
    !!basic?.employeeNumber
  if (!hasAnyData) return null

  return (
    <section className="mt-6 border-l-4 border-emerald-500 bg-emerald-50/50 p-5">
      <div className="flex items-center gap-2">
        <Building2 className="h-5 w-5 text-emerald-700" />
        <h2 className="text-base font-bold text-gray-900">
          企業情報（公式データ）
        </h2>
        <span className="ml-auto text-xs text-gray-500">
          経済産業省 GbizINFO 連携
        </span>
      </div>

      {/* 基本情報 */}
      {(basic?.dateOfEstablishment ||
        basic?.capitalStock ||
        basic?.employeeNumber) && (
        <dl className="mt-4 grid gap-3 sm:grid-cols-3">
          {basic?.dateOfEstablishment && (
            <Cell label="設立" value={basic.dateOfEstablishment} />
          )}
          {basic?.capitalStock != null && (
            <Cell
              label="資本金"
              value={`${basic.capitalStock.toLocaleString()} 円`}
            />
          )}
          {basic?.employeeNumber != null && (
            <Cell
              label="従業員数"
              value={`${basic.employeeNumber.toLocaleString()} 人`}
            />
          )}
        </dl>
      )}

      {/* 建設業許可 */}
      {permits.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-emerald-800">
            <CheckCircle2 className="h-4 w-4" />
            建設業許可
          </h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {permits.map((p) => (
              <li
                key={p}
                className="inline-flex items-center bg-white border border-emerald-300 px-3 py-1.5 text-xs font-bold text-emerald-800"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 表彰歴 */}
      {commendations.length > 0 && (
        <div className="mt-5">
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-amber-800">
            <Award className="h-4 w-4" />
            表彰歴
          </h3>
          <ul className="mt-2 space-y-1.5">
            {commendations.slice(0, 5).map((c, i) => (
              <li key={i} className="text-sm text-gray-800">
                <span className="font-bold">{c.title}</span>
                {c.date && (
                  <span className="ml-2 text-xs text-gray-500">({c.date})</span>
                )}
                {c.authority && (
                  <span className="ml-2 text-xs text-gray-400">
                    / {c.authority}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {gbizSyncedAt && (
        <p className="mt-4 text-xs text-gray-400">
          最終更新: {gbizSyncedAt.toLocaleDateString("ja-JP")}
        </p>
      )}
    </section>
  )
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm font-bold text-gray-900">{value}</dd>
    </div>
  )
}
