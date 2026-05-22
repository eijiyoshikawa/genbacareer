/**
 * Google JobPosting 構造化データ仕様の必須 / 推奨フィールドを検証する。
 *
 * 仕様: https://developers.google.com/search/docs/appearance/structured-data/job-posting
 *
 * 必須フィールド (これが欠けると Google 検索結果に出ない):
 *   @context / @type / title / description / datePosted / hiringOrganization /
 *   jobLocation (or applicantLocationRequirements for remote)
 *
 * 強く推奨 (これが欠けると Rich Results Test で警告):
 *   baseSalary (or estimatedSalary) / employmentType / validThrough / identifier /
 *   directApply
 *
 * このバリデータは Playwright E2E から実 HTML の <script type="application/ld+json">
 * を取り出して検証する用途と、ユニットテストで `generateJobPostingSchema` の出力を
 * 検証する用途の両方で使う。
 */

export type ValidationResult = {
  valid: boolean
  errors: string[]
  warnings: string[]
}

const REQUIRED_FIELDS = [
  "@context",
  "@type",
  "title",
  "description",
  "datePosted",
  "hiringOrganization",
] as const

const RECOMMENDED_FIELDS = [
  "validThrough",
  "employmentType",
  "identifier",
  "directApply",
] as const

function hasField(obj: Record<string, unknown>, key: string): boolean {
  const v = obj[key]
  if (v === undefined || v === null) return false
  if (typeof v === "string" && v.trim() === "") return false
  if (Array.isArray(v) && v.length === 0) return false
  return true
}

export function validateJobPostingJsonLd(
  raw: unknown,
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      valid: false,
      errors: ["JobPosting JSON-LD はオブジェクトである必要があります"],
      warnings: [],
    }
  }

  const obj = raw as Record<string, unknown>

  if (obj["@context"] !== "https://schema.org") {
    errors.push(`@context は "https://schema.org" である必要があります (got: ${String(obj["@context"])})`)
  }

  if (obj["@type"] !== "JobPosting") {
    errors.push(`@type は "JobPosting" である必要があります (got: ${String(obj["@type"])})`)
  }

  for (const field of REQUIRED_FIELDS) {
    if (!hasField(obj, field)) {
      errors.push(`必須フィールドが欠けています: ${field}`)
    }
  }

  // jobLocation か applicantLocationRequirements のいずれかが必要
  if (!hasField(obj, "jobLocation") && !hasField(obj, "applicantLocationRequirements")) {
    errors.push(
      "jobLocation か applicantLocationRequirements のいずれかが必要です",
    )
  }

  // 給与は baseSalary か estimatedSalary のいずれかを推奨
  if (!hasField(obj, "baseSalary") && !hasField(obj, "estimatedSalary")) {
    warnings.push(
      "baseSalary または estimatedSalary を設定することを推奨します (Google 検索結果に給与レンジが表示される)",
    )
  }

  for (const field of RECOMMENDED_FIELDS) {
    if (!hasField(obj, field)) {
      warnings.push(`推奨フィールドが欠けています: ${field}`)
    }
  }

  // hiringOrganization が Organization 型か簡易チェック
  const hiringOrg = obj.hiringOrganization as Record<string, unknown> | undefined
  if (hiringOrg && typeof hiringOrg === "object") {
    if (hiringOrg["@type"] !== "Organization") {
      warnings.push(
        `hiringOrganization.@type は "Organization" を推奨します (got: ${String(hiringOrg["@type"])})`,
      )
    }
    if (!hasField(hiringOrg, "name")) {
      errors.push("hiringOrganization.name は必須です")
    }
  }

  // datePosted が ISO 8601 形式か簡易チェック
  const datePosted = obj.datePosted
  if (typeof datePosted === "string") {
    if (!/^\d{4}-\d{2}-\d{2}/.test(datePosted)) {
      errors.push(`datePosted は ISO 8601 形式 (YYYY-MM-DD...) である必要があります (got: ${datePosted})`)
    }
  }

  // validThrough が将来日付か (期限切れだと Google が出さない)
  const validThrough = obj.validThrough
  if (typeof validThrough === "string") {
    const date = new Date(validThrough)
    if (!isNaN(date.getTime()) && date.getTime() < Date.now()) {
      warnings.push(`validThrough が過去日付です (${validThrough}) — Google 検索結果に表示されません`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}
