import type { ReactNode } from "react"
import {
  Briefcase,
  IdentificationCard,
  UserFocus,
  MapPin,
  Money,
  Clock,
  CalendarBlank,
  Gift,
  Megaphone,
  ChatCircleText,
} from "@phosphor-icons/react/dist/ssr"

/**
 * 求人詳細「募集要項」セクション。
 * 建職バンク参考の「左：アイコン＋大ラベル ／ 右：小見出し＋本文」2カラム構成。
 * 値が無い行・ブロックは描画しない。
 */

type JobSpecData = {
  description: string | null
  requirements: string | null
  jobConditionNotes: string | null
  employmentType: string | null
  trialPeriod: string | null
  prefecture: string
  city: string | null
  address: string | null
  baseSalary: string | null
  bonus: string | null
  commuteAllowance: string | null
  fixedOvertime: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  workHours: string | null
  workHoursNotes: string | null
  holidays: string | null
  holidaysOther: string | null
  annualHolidays: number | null
  insurance: string | null
  benefits: string[] | null
  smokingPolicy: string | null
  requiredExperience: string | null
  education: string | null
  recruitmentCount: string | null
  recruitmentReason: string | null
  company: {
    idealCandidate: string | null
    employeeVoice: string | null
    tagline: string | null
  } | null
}

const isBlank = (v: string | null | undefined) =>
  v === null || v === undefined || v.trim() === ""

function salaryLabel(
  min: number | null,
  max: number | null,
  type: string | null,
): string | null {
  if (!min && !max) return null
  const unit =
    type === "hourly" ? "時給" : type === "annual" ? "年収" : type === "daily" ? "日給" : "月給"
  const useMan = type !== "hourly" && type !== "daily"
  const fmt = (n: number) =>
    useMan && n >= 10000 ? `${(n / 10000).toFixed(0)}万円` : `${n.toLocaleString()}円`
  if (min && max) return `${unit} ${fmt(min)} 〜 ${fmt(max)}`
  if (min) return `${unit} ${fmt(min)}〜`
  return `${unit} 〜${fmt(max!)}`
}

export function JobSpec({ job }: { job: JobSpecData }) {
  const c = job.company

  return (
    <section id="conditions">
      <h2 className="section-bar mb-1 text-xl font-bold text-gray-900 sm:text-2xl">
        募集要項
      </h2>
      <div className="border-t-2 border-gray-200">
        {/* 仕事内容 */}
        {(!isBlank(job.description) || !isBlank(job.jobConditionNotes)) && (
          <SpecRow icon={<Briefcase weight="duotone" />} label="仕事内容">
            {!isBlank(job.description) && <Block body={job.description!} />}
            {!isBlank(job.jobConditionNotes) && (
              <Block title="特記事項" body={job.jobConditionNotes!} />
            )}
          </SpecRow>
        )}

        {/* 応募条件 */}
        {(!isBlank(job.requiredExperience) ||
          !isBlank(job.requirements) ||
          !isBlank(job.education)) && (
          <SpecRow icon={<IdentificationCard weight="duotone" />} label="応募条件">
            {!isBlank(job.requiredExperience) && (
              <Block title="必要な経験・資格" body={job.requiredExperience!} />
            )}
            {isBlank(job.requiredExperience) && !isBlank(job.requirements) && (
              <Block title="必要な経験・資格" body={job.requirements!} />
            )}
            {!isBlank(job.education) && <Block title="学歴" body={job.education!} />}
          </SpecRow>
        )}

        {/* 求める人物像 */}
        {c && !isBlank(c.idealCandidate) && (
          <SpecRow icon={<UserFocus weight="duotone" />} label="求める人物像">
            <Block body={c.idealCandidate!} />
          </SpecRow>
        )}

        {/* 雇用形態 */}
        {(!isBlank(job.employmentType) || !isBlank(job.trialPeriod)) && (
          <SpecRow icon={<Briefcase weight="duotone" />} label="雇用形態">
            {!isBlank(job.employmentType) && (
              <Block body={employmentLabel(job.employmentType!)} />
            )}
            {!isBlank(job.trialPeriod) && <Block title="試用期間" body={job.trialPeriod!} />}
          </SpecRow>
        )}

        {/* 勤務地 */}
        <SpecRow icon={<MapPin weight="duotone" />} label="勤務地">
          <Block
            body={[job.prefecture, job.city, job.address]
              .filter((v) => !isBlank(v))
              .join(" ")}
          />
        </SpecRow>

        {/* 給与 */}
        {(salaryLabel(job.salaryMin, job.salaryMax, job.salaryType) ||
          !isBlank(job.baseSalary) ||
          !isBlank(job.bonus) ||
          !isBlank(job.fixedOvertime) ||
          !isBlank(job.commuteAllowance)) && (
          <SpecRow icon={<Money weight="duotone" />} label="給与">
            {salaryLabel(job.salaryMin, job.salaryMax, job.salaryType) && (
              <p className="text-lg font-extrabold text-primary-700">
                {salaryLabel(job.salaryMin, job.salaryMax, job.salaryType)}
              </p>
            )}
            {!isBlank(job.baseSalary) && <Block title="基本給" body={job.baseSalary!} />}
            {!isBlank(job.fixedOvertime) && (
              <Block title="固定残業代" body={job.fixedOvertime!} />
            )}
            {!isBlank(job.bonus) && <Block title="賞与" body={job.bonus!} />}
            {!isBlank(job.commuteAllowance) && (
              <Block title="通勤手当" body={job.commuteAllowance!} />
            )}
          </SpecRow>
        )}

        {/* 勤務時間 */}
        {(!isBlank(job.workHours) || !isBlank(job.workHoursNotes)) && (
          <SpecRow icon={<Clock weight="duotone" />} label="勤務時間">
            {!isBlank(job.workHours) && <Block body={job.workHours!} />}
            {!isBlank(job.workHoursNotes) && <Block body={job.workHoursNotes!} />}
          </SpecRow>
        )}

        {/* 休日・休暇 */}
        {(!isBlank(job.holidays) ||
          !isBlank(job.holidaysOther) ||
          job.annualHolidays != null) && (
          <SpecRow icon={<CalendarBlank weight="duotone" />} label="休日・休暇">
            {job.annualHolidays != null && (
              <Block body={`年間休日：${job.annualHolidays}日`} />
            )}
            {!isBlank(job.holidays) && <Block body={job.holidays!} />}
            {!isBlank(job.holidaysOther) && <Block body={job.holidaysOther!} />}
          </SpecRow>
        )}

        {/* 待遇・福利厚生 */}
        {(!isBlank(job.insurance) ||
          (job.benefits && job.benefits.length > 0) ||
          !isBlank(job.smokingPolicy)) && (
          <SpecRow icon={<Gift weight="duotone" />} label="待遇・福利厚生">
            {!isBlank(job.insurance) && <Block title="社会保険" body={job.insurance!} />}
            {job.benefits && job.benefits.length > 0 && (
              <ul className="space-y-1 text-sm leading-relaxed text-gray-700">
                {job.benefits.map((b, i) => (
                  <li key={i}>■ {b}</li>
                ))}
              </ul>
            )}
            {!isBlank(job.smokingPolicy) && (
              <Block title="受動喫煙対策" body={job.smokingPolicy!} />
            )}
          </SpecRow>
        )}

        {/* 採用概要 */}
        {(!isBlank(job.recruitmentReason) || !isBlank(job.recruitmentCount)) && (
          <SpecRow icon={<Megaphone weight="duotone" />} label="採用概要">
            {!isBlank(job.recruitmentReason) && (
              <Block title="募集の背景" body={job.recruitmentReason!} />
            )}
            {!isBlank(job.recruitmentCount) && (
              <Block title="採用人数" body={job.recruitmentCount!} />
            )}
          </SpecRow>
        )}

        {/* 企業からのメッセージ */}
        {c && (!isBlank(c.employeeVoice) || !isBlank(c.tagline)) && (
          <SpecRow icon={<ChatCircleText weight="duotone" />} label="企業からのメッセージ">
            {!isBlank(c.tagline) && (
              <p className="text-base font-bold text-gray-900">{c.tagline}</p>
            )}
            {!isBlank(c.employeeVoice) && <Block body={c.employeeVoice!} />}
          </SpecRow>
        )}
      </div>
    </section>
  )
}

function SpecRow({
  icon,
  label,
  children,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
}) {
  return (
    <div className="grid grid-cols-1 gap-2 border-b border-gray-200 py-5 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-6">
      <div className="flex items-center gap-2">
        <span className="text-primary-600 [&>svg]:h-5 [&>svg]:w-5">{icon}</span>
        <span className="text-sm font-bold text-gray-900">{label}</span>
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </div>
  )
}

function Block({ title, body }: { title?: string; body: string }) {
  return (
    <div>
      {title && (
        <h3 className="section-bar text-sm font-bold text-gray-900">{title}</h3>
      )}
      <p className={`whitespace-pre-wrap text-sm leading-relaxed text-gray-700 ${title ? "mt-1.5" : ""}`}>
        {body}
      </p>
    </div>
  )
}

function employmentLabel(type: string): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート・アルバイト",
    contract: "契約社員",
  }
  return labels[type] ?? type
}
