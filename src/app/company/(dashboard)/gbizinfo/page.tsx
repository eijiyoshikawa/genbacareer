import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { Building2, ExternalLink, CheckCircle2 } from "lucide-react"
import {
  hasGbizData,
  extractConstructionPermits,
  isGbizConfigured,
  type GbizSnapshot,
} from "@/lib/gbizinfo"
import { GbizInfoForm } from "./form"

export const metadata = {
  title: "法人番号・建設業許可",
}

export default async function CompanyGbizInfoPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    redirect("/login")
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return (
      <div className="border bg-red-50 border-red-200 p-4 text-sm text-red-800">
        企業情報が見つかりません。
      </div>
    )
  }

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      name: true,
      corporateNumber: true,
      gbizData: true,
      gbizSyncedAt: true,
    },
  })
  if (!company) {
    return (
      <div className="border bg-red-50 border-red-200 p-4 text-sm text-red-800">
        企業情報が見つかりません。
      </div>
    )
  }

  const snapshot = hasGbizData(company.gbizData)
    ? (company.gbizData as GbizSnapshot)
    : null
  const permits = snapshot ? extractConstructionPermits(snapshot) : []
  const isAdmin = role === "company_admin"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Building2 className="h-6 w-6 text-primary-500" />
          法人番号・建設業許可
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          国税庁 / 経済産業省の GbizINFO から法人番号で企業情報を自動取得します。
          建設業許可・設立年月日・表彰歴などが企業詳細ページに自動で表示されます。
        </p>
      </div>

      {!isGbizConfigured() && (
        <div className="border bg-amber-50 border-amber-200 p-4 text-sm text-amber-900">
          ⚠️ サーバー側で <code>GBIZ_API_TOKEN</code>{" "}
          環境変数が設定されていません。法人番号の保存は可能ですが、企業情報の自動取得は無効です。
        </div>
      )}

      <GbizInfoForm
        companyName={company.name}
        corporateNumber={company.corporateNumber}
        syncedAt={company.gbizSyncedAt}
        canEdit={isAdmin}
      />

      {/* 取得済みデータのプレビュー */}
      {snapshot && (
        <section className="border bg-white p-6">
          <h2 className="text-lg font-bold text-gray-900">
            取得済みの企業情報（GbizINFO 経由）
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            最終取得:{" "}
            {company.gbizSyncedAt?.toLocaleString("ja-JP") ?? "—"}
          </p>

          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <Row label="正式名称" value={snapshot.basic?.name} />
            <Row label="代表者" value={snapshot.basic?.representativeName} />
            <Row
              label="所在地"
              value={[
                snapshot.basic?.prefectureName,
                snapshot.basic?.cityName,
                snapshot.basic?.streetNumber,
              ]
                .filter(Boolean)
                .join(" ")}
            />
            <Row label="郵便番号" value={snapshot.basic?.postalCode} />
            <Row
              label="設立"
              value={snapshot.basic?.dateOfEstablishment}
            />
            <Row
              label="資本金"
              value={
                snapshot.basic?.capitalStock != null
                  ? `${snapshot.basic.capitalStock.toLocaleString()} 円`
                  : undefined
              }
            />
            <Row
              label="従業員数"
              value={
                snapshot.basic?.employeeNumber != null
                  ? `${snapshot.basic.employeeNumber.toLocaleString()} 人`
                  : undefined
              }
            />
            <Row label="法人 URL" value={snapshot.basic?.companyUrl} link />
          </dl>

          {/* 建設業許可 */}
          {permits.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                建設業許可
              </h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {permits.map((p) => (
                  <li
                    key={p}
                    className="inline-flex items-center bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700"
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 表彰歴 */}
          {snapshot.commendations.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-bold text-gray-900">表彰歴</h3>
              <ul className="mt-2 space-y-1">
                {snapshot.commendations.map((c, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    <span className="font-bold">{c.title}</span>
                    {c.date && (
                      <span className="ml-2 text-xs text-gray-500">
                        ({c.date})
                      </span>
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
        </section>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  link = false,
}: {
  label: string
  value?: string | null
  link?: boolean
}) {
  if (!value) return null
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">
        {link ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary-600 hover:underline break-all"
          >
            {value}
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}
