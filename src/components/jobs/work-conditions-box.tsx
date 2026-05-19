import {
  Clock,
  Calendar,
  Train,
  ShieldCheck,
  CalendarCheck,
} from "@phosphor-icons/react/dist/ssr"
import { extractWorkConditions } from "@/lib/job-enrichment"

type StructuredFields = {
  workHours: string | null
  workHoursNotes: string | null
  holidays: string | null
  holidaysOther: string | null
  annualHolidays: number | null
  insurance: string | null
}

/**
 * 構造化済みのカラム値を優先しつつ、未取得分は description / requirements からの抽出で補完して
 * 勤務条件カードを表示する。
 *
 * structured 引数があれば「ハローワーク API から取得した正規化済みの値」を信頼し、
 * 文章解析に頼らない。何も埋まらない場合は null を返して非表示。
 */
export function WorkConditionsBox({
  description,
  requirements,
  structured,
}: {
  description: string | null | undefined
  requirements: string | null | undefined
  structured?: Partial<StructuredFields>
}) {
  const fallback = extractWorkConditions(description, requirements)

  const workingHours = joinNonEmpty(
    structured?.workHours,
    structured?.workHoursNotes
  ) || fallback.workingHours

  const holidays = joinNonEmpty(
    structured?.holidays,
    structured?.holidaysOther
  ) || fallback.holidays

  const insurance = structured?.insurance || fallback.insurance
  const accessNote = fallback.accessNote
  const annualHolidays = structured?.annualHolidays ?? null

  const hasAny = workingHours || holidays || accessNote || insurance || annualHolidays != null
  if (!hasAny) return null

  return (
    <div className="border bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 border-b pb-3">
        勤務条件
      </h2>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {workingHours && (
          <Item icon={<Clock weight="duotone" className="h-4 w-4 text-primary-500" />} label="勤務時間" value={workingHours} />
        )}
        {holidays && (
          <Item icon={<Calendar weight="duotone" className="h-4 w-4 text-primary-500" />} label="休日" value={holidays} />
        )}
        {annualHolidays != null && (
          <Item
            icon={<CalendarCheck weight="duotone" className="h-4 w-4 text-primary-500" />}
            label="年間休日"
            value={`${annualHolidays}日`}
          />
        )}
        {accessNote && (
          <Item icon={<Train weight="duotone" className="h-4 w-4 text-primary-500" />} label="通勤" value={accessNote} />
        )}
        {insurance && (
          <Item icon={<ShieldCheck weight="duotone" className="h-4 w-4 text-primary-500" />} label="保険" value={insurance} />
        )}
      </dl>
      <p className="mt-3 text-xs text-gray-500">
        ※ 公共求人掲載情報をもとに表示しています。最終的な条件は応募先にご確認ください。
      </p>
    </div>
  )
}

function joinNonEmpty(...parts: Array<string | null | undefined>): string {
  return parts.filter((p): p is string => !!p && p.trim().length > 0).join(" / ")
}

function Item({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5">{icon}</div>
      <div>
        <dt className="text-xs font-medium text-gray-400">{label}</dt>
        <dd className="text-sm font-medium text-gray-900">{value}</dd>
      </div>
    </div>
  )
}
