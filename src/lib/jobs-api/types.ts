/**
 * HelloWork connector API 型定義
 *
 * 仕様: hellowork-api-connector の docs/API_HANDOVER.md に準拠。
 * Prisma の Job モデルと衝突しないよう、すべて Hw プレフィックスで命名。
 */

export interface HwJobCompany {
  name: string | null
  nameKana: string | null
  hojinno: string | null
  website: string | null
  description: string | null
  strengths: string | null
}

export interface HwJobLocation {
  prefecture: string | null
  address: string | null
  employerAddress: string | null
  employerPostalCode: string | null
  nearestStation: string | null
}

export interface HwJobSalary {
  type: string | null
  display: string | null
  min: number | null
  max: number | null
  base: string | null
  bonus: string | null
}

export interface HwJobBenefits {
  annualHolidays: number | null
  insurance: string | null
}

export interface HwJobContact {
  name: string | null
  role: string | null
  tel: string | null
  email: string | null
}

export interface HwJobDates {
  receivedAt: string | null
  validUntil: string | null
  applyBy: string | null
}

export interface HwJob {
  kjno: string
  sourceDataId: string
  title: string | null
  occupation: string | null
  description: string | null
  jobType: string | null
  employmentType: string | null
  employmentPeriod: string | null
  remoteWork: string | null
  company: HwJobCompany
  location: HwJobLocation
  salary: HwJobSalary
  benefits: HwJobBenefits
  contact: HwJobContact
  dates: HwJobDates
}

export interface HwPagination {
  offset: number
  limit: number
  total: number
  hasMore: boolean
}

export interface HwListMeta {
  lastSyncedAt: string | null
}

export interface HwJobListResponse {
  items: HwJob[]
  pagination: HwPagination
  meta: HwListMeta
}

export interface HwJobDetailResponse {
  job: HwJob
}

export interface HwEmployerSummary {
  name: string | null
  nameKana: string | null
  hojinno: string | null
  website: string | null
  description: string | null
  strengths: string | null
}

export interface HwEmployerJobsResponse {
  employer: HwEmployerSummary | null
  items: HwJob[]
  pagination: HwPagination
}

export interface HwMetaResponse {
  total: number
  byPrefecture: Record<string, number>
  byJobType: Record<string, number>
  lastSyncedAt: string | null
  sourceDataId: string | null
}

export type HwJobType = "フルタイム" | "パート" | "季節" | "出稼ぎ"

export interface HwListJobsParams {
  prefecture?: string
  jobType?: HwJobType | string
  employmentType?: string
  minSalary?: number
  q?: string
  offset?: number
  limit?: number
}

export interface HwEmployerJobsParams {
  offset?: number
  limit?: number
}

export interface HwApiErrorBody {
  error: {
    code: string
    message: string
    details?: unknown
  }
}
