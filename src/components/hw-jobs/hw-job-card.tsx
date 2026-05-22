import Link from "next/link"
import { Banknote, Building2, ChevronRight, MapPin } from "lucide-react"
import type { HwJob } from "@/lib/jobs-api"
import { formatSalaryRange } from "@/lib/jobs-api/format"

export function HwJobCard({ job }: { job: HwJob }) {
  const salary = formatSalaryRange(job.salary)
  const company = job.company.name
  const prefecture = job.location.prefecture
  const address = job.location.address ?? job.location.employerAddress

  return (
    <Link
      href={`/hw-jobs/${encodeURIComponent(job.kjno)}`}
      className="group flex gap-4  border border-warm-200 bg-white p-4 shadow-sm transition hover:shadow-md hover:border-primary-300"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            公共求人
          </span>
          {job.jobType && (
            <span className=" bg-warm-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {job.jobType}
            </span>
          )}
          {job.employmentType && (
            <span className=" bg-warm-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {job.employmentType}
            </span>
          )}
        </div>

        <h3 className="mt-1.5 text-base font-bold text-ink-900 line-clamp-2 group-hover:text-primary-600 transition">
          {job.title ?? "（タイトル無し）"}
        </h3>

        {company && (
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            {company}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
          {prefecture && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-gray-400" />
              {prefecture}
              {address && address !== prefecture && (
                <span className="text-gray-400 text-xs"> · {truncate(address, 24)}</span>
              )}
            </span>
          )}
          {salary && (
            <span className="flex items-center gap-1 font-bold text-primary-600">
              <Banknote className="h-3.5 w-3.5" />
              {salary}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="hidden sm:block h-5 w-5 self-center text-gray-300 group-hover:text-primary-500 transition" />
    </Link>
  )
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`
}
