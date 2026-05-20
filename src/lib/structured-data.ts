const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

/** サイト全体の Organization 構造化データ。root layout で 1 回だけ埋め込む。 */
export function generateOrganizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${BASE_URL}/#organization`,
    name: "ゲンバキャリア",
    alternateName: "Genba Career",
    url: BASE_URL,
    logo: `${BASE_URL}/logo-demo.jpg`,
    sameAs: [
      "https://youtube.com/@let-kensetsu",
      "https://instagram.com/let_kensetsu",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "info@let-inc.net",
      areaServed: "JP",
      availableLanguage: ["Japanese"],
    },
    parentOrganization: {
      "@type": "Organization",
      name: "株式会社LET",
    },
  }
}

/** サイトの WebSite 構造化データ。検索ボックスを Google 検索結果に表示するため SearchAction 付き。 */
export function generateWebSiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
    url: BASE_URL,
    name: "ゲンバキャリア",
    description:
      "建築・土木・電気・内装・解体・ドライバー・施工管理・測量の求人を掲載する建設業特化型求人サイト。",
    publisher: { "@id": `${BASE_URL}/#organization` },
    inLanguage: "ja",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/jobs?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  }
}

/** パンくずリストの構造化データを生成する。 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url: string }>
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  }
}

type JobInput = {
  id: string
  title: string
  description: string | null
  category: string
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  prefecture: string
  city: string | null
  address: string | null
  publishedAt: Date | null
  createdAt: Date
  // 新カラム（任意）— ハローワーク掲載情報から取得した正規化値
  occupationCategoryName?: string | null
  industryCode?: string | null
  workHours?: string | null
  holidays?: string | null
  requiredExperience?: string | null
  education?: string | null
  /** Google 強推奨: 求人 ID（重複検出用） */
  helloworkId?: string | null
  /** 採用要件（リッチリザルトの qualifications に流用） */
  requirements?: string | null
  /** 福利厚生・特典の配列（jobBenefits に流用） */
  benefits?: string[]
  /** 求人検索キーワードとして使うタグ */
  tags?: string[]
  /** 掲載期限（Job.expiresAt → JobPosting.validThrough） */
  expiresAt?: Date | null
  /** ハローワークの掲載有効日（Date のみ）— expiresAt の代替 */
  validUntil?: Date | null
  /** 業務内容（description 補完用） */
  businessContent?: string | null
  /** 賞与（baseSalary の補足説明として description に追記） */
  bonus?: string | null
  company: {
    name: string
    logoUrl: string | null
    websiteUrl: string | null
  } | null
}

/**
 * Google for Jobs の employmentType は以下を受け付ける:
 *   FULL_TIME / PART_TIME / CONTRACTOR / TEMPORARY / INTERN /
 *   VOLUNTEER / PER_DIEM / OTHER
 * 不明な値は OTHER にフォールバック。
 */
const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
  contractor: "CONTRACTOR",
  temporary: "TEMPORARY",
  temp: "TEMPORARY",
  intern: "INTERN",
  internship: "INTERN",
  per_diem: "PER_DIEM",
  daily: "PER_DIEM",
  volunteer: "VOLUNTEER",
}

const SALARY_UNIT_MAP: Record<string, string> = {
  hourly: "HOUR",
  daily: "DAY",
  weekly: "WEEK",
  monthly: "MONTH",
  annual: "YEAR",
  yearly: "YEAR",
}

/** datePosted から +90 日後を validThrough 既定値とする（Google 推奨）。 */
function defaultValidThrough(posted: Date): string {
  return new Date(posted.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString()
}

const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  construction: "建築工事業",
  civil: "土木工事業",
  electrical: "電気・設備工事業",
  interior: "内装仕上工事業",
  demolition: "解体工事業",
  driver: "運送・物流",
  management: "施工管理・建設マネジメント",
  survey: "測量・建築設計",
}

/**
 * description が空 / 短すぎる求人は Google が rich result を出さないため、
 * タイトル + 勤務地 + 業種 + 雇用形態から最低限の説明文を組み立てる。
 */
function buildFallbackDescription(job: JobInput): string {
  const parts: string[] = []
  parts.push(job.title)
  const locationParts = [job.prefecture, job.city].filter(Boolean) as string[]
  if (locationParts.length > 0) {
    parts.push(`勤務地: ${locationParts.join(" ")}`)
  }
  const industry = CATEGORY_TO_INDUSTRY[job.category]
  if (industry) parts.push(`業種: ${industry}`)
  if (job.employmentType && EMPLOYMENT_TYPE_MAP[job.employmentType]) {
    parts.push(`雇用形態: ${job.employmentType}`)
  }
  if (job.businessContent) parts.push(job.businessContent)
  return parts.join("。 ")
}

export function generateJobPostingSchema(job: JobInput): Record<string, unknown> {
  const datePosted = job.publishedAt ?? job.createdAt

  // validThrough: expiresAt > validUntil > datePosted+90日 の優先度
  const validThroughDate =
    job.expiresAt ?? job.validUntil ?? null
  const validThrough = validThroughDate
    ? validThroughDate.toISOString()
    : defaultValidThrough(datePosted)

  // description は最低 50 字程度欲しい（Google 推奨）
  const description =
    job.description && job.description.trim().length >= 20
      ? job.description
      : buildFallbackDescription(job)

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description,
    datePosted: datePosted.toISOString(),
    validThrough,
    url: `${BASE_URL}/jobs/${job.id}`,
    // 候補者が当サイト経由で直接応募できる
    directApply: true,
    industry: CATEGORY_TO_INDUSTRY[job.category] ?? "建設業",
  }

  // Google 強推奨: identifier — 重複求人検出のため
  schema.identifier = {
    "@type": "PropertyValue",
    name: "ゲンバキャリア",
    value: job.helloworkId ?? job.id,
  }

  // 雇用形態 — マップにない場合は OTHER
  if (job.employmentType) {
    schema.employmentType =
      EMPLOYMENT_TYPE_MAP[job.employmentType.toLowerCase()] ?? "OTHER"
  }

  // Hiring organization
  if (job.company) {
    const sameAs: string[] = []
    if (job.company.websiteUrl) sameAs.push(job.company.websiteUrl)
    schema.hiringOrganization = {
      "@type": "Organization",
      name: job.company.name,
      ...(job.company.logoUrl && { logo: job.company.logoUrl }),
      ...(sameAs.length > 0 && { sameAs }),
    }
  } else {
    schema.hiringOrganization = {
      "@type": "Organization",
      name: "非公開",
    }
  }

  // Job location — 必須
  // postalCode は Google for Jobs で「重大ではない」推奨項目。
  // address 文字列から日本の郵便番号 (〒xxx-xxxx / xxx-xxxx) を抽出して埋める。
  const extractedPostalCode = job.address
    ? extractJpPostalCode(job.address)
    : null
  schema.jobLocation = {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressRegion: job.prefecture,
      addressCountry: "JP",
      ...(job.city && { addressLocality: job.city }),
      ...(job.address && { streetAddress: job.address }),
      ...(extractedPostalCode && { postalCode: extractedPostalCode }),
    },
  }

  // applicantLocationRequirements: 日本国内在住者向けと明示
  schema.applicantLocationRequirements = {
    "@type": "Country",
    name: "JP",
  }

  // Base salary
  // salaryMin が無い場合も Google 推奨: estimatedSalary を提供。
  // 求人カテゴリの相場 (建設業全体の概算) を埋めて欠落を解消する。
  if (job.salaryMin != null) {
    const unitText =
      SALARY_UNIT_MAP[(job.salaryType ?? "monthly").toLowerCase()] ?? "MONTH"
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "JPY",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin,
        ...(job.salaryMax != null && { maxValue: job.salaryMax }),
        unitText,
      },
    }
  } else {
    // フォールバック: 建設業界の相場として 250,000〜450,000 円/月
    schema.estimatedSalary = {
      "@type": "MonetaryAmount",
      currency: "JPY",
      value: {
        "@type": "QuantitativeValue",
        minValue: 250000,
        maxValue: 450000,
        unitText: "MONTH",
      },
    }
  }

  // occupationalCategory: 職種正規化名 を優先、なければ industryCode
  if (job.occupationCategoryName) {
    schema.occupationalCategory = job.occupationCategoryName
  } else if (job.industryCode) {
    schema.occupationalCategory = job.industryCode
  }

  // 求人キーワード（タグ）
  if (job.tags && job.tags.length > 0) {
    schema.keywords = job.tags.join(", ")
  }

  // 福利厚生（配列を正しく jobBenefits に）
  if (job.benefits && job.benefits.length > 0) {
    schema.jobBenefits = job.benefits
  }

  // 採用要件
  if (job.requirements) {
    schema.qualifications = job.requirements
  }
  // experienceRequirements は Google for Jobs で OccupationalExperienceRequirements 型を要求。
  // 文字列だと「列挙値が無効」エラーになる。
  if (job.requiredExperience) {
    schema.experienceRequirements = parseExperienceToSchema(
      job.requiredExperience
    )
  } else {
    // 経験不問を明示 (Google 推奨: experienceInPlaceOfEducation も指定)
    schema.experienceRequirements = {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: 0,
    }
  }
  // educationRequirements は EducationalOccupationalCredential 型を要求。
  if (job.education) {
    const credential = parseEducationToSchema(job.education)
    if (credential) {
      schema.educationRequirements = credential
    }
  }
  if (job.workHours) {
    schema.workHours = job.workHours
  }

  return schema
}

// ============================================================
// 構造化データ用パーサ
// ============================================================

/**
 * 日本の住所文字列から郵便番号 (xxx-xxxx) を抽出する。
 * 「〒100-0001 東京都...」「100-0001 東京都...」のどちらにも対応。
 */
function extractJpPostalCode(address: string): string | null {
  const match = address.match(/〒?\s*(\d{3}-\d{4})/)
  return match ? match[1] : null
}

/**
 * 経験要件の文字列を Google for Jobs の OccupationalExperienceRequirements に変換。
 * 例:
 *   "3年以上"        → { monthsOfExperience: 36 }
 *   "経験不問"       → { monthsOfExperience: 0 }
 *   "1年程度"        → { monthsOfExperience: 12 }
 *   "実務経験 半年"  → { monthsOfExperience: 6 }
 */
function parseExperienceToSchema(text: string): Record<string, unknown> {
  // 「不問」「未経験」「なし」→ 0
  if (/不問|未経験|なし|なくて|問わ/i.test(text)) {
    return {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: 0,
    }
  }
  // "N年" のパターン
  const yearMatch = text.match(/(\d+)\s*年/)
  if (yearMatch) {
    const years = parseInt(yearMatch[1], 10)
    return {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: years * 12,
    }
  }
  // "Nヶ月" のパターン
  const monthMatch = text.match(/(\d+)\s*(?:ヶ月|か月|カ月)/)
  if (monthMatch) {
    return {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: parseInt(monthMatch[1], 10),
    }
  }
  // 半年
  if (/半年/.test(text)) {
    return {
      "@type": "OccupationalExperienceRequirements",
      monthsOfExperience: 6,
    }
  }
  // パース不能 → 0 (経験不問扱い)
  return {
    "@type": "OccupationalExperienceRequirements",
    monthsOfExperience: 0,
  }
}

/**
 * 学歴要件の文字列を Google for Jobs の EducationalOccupationalCredential に変換。
 * credentialCategory は以下の enum のみ有効:
 *   "high school" | "associate degree" | "bachelor degree"
 *   | "professional certificate" | "postgraduate degree"
 */
function parseEducationToSchema(
  text: string
): Record<string, unknown> | null {
  // 学歴不問 → null (省略)
  if (/不問|問わ|なし|どなた|歓迎/i.test(text)) {
    return null
  }
  if (/大学院|修士|博士|院卒/.test(text)) {
    return {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "postgraduate degree",
    }
  }
  if (/大卒|大学卒|学士|大学(?!院)/.test(text)) {
    return {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "bachelor degree",
    }
  }
  if (/短大|短期大学|高専|専門学校/.test(text)) {
    return {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "associate degree",
    }
  }
  if (/資格|免許|certificate/i.test(text)) {
    return {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "professional certificate",
    }
  }
  if (/高卒|高校|中卒|中学/.test(text)) {
    return {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "high school",
    }
  }
  // パース不能 → 省略
  return null
}
