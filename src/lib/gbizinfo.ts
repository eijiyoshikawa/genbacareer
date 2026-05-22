/**
 * GbizINFO API クライアント（スタブ）。
 *
 * 経済産業省提供の法人情報 API:
 *   https://info.gbiz.go.jp/hojin/Api
 *
 * 認証: x-hojinInfo-api-token ヘッダで API キー送信
 * 主要エンドポイント:
 *   - GET /hojin/v1/hojin/{corporateNumber}     基本情報
 *   - GET /hojin/v1/hojin/{corporateNumber}/certification  許認可（建設業許可など）
 *   - GET /hojin/v1/hojin/{corporateNumber}/commendation    表彰歴
 *   - GET /hojin/v1/hojin/{corporateNumber}/subsidy         補助金獲得歴
 *   - GET /hojin/v1/hojin/{corporateNumber}/finance         財務情報
 *
 * 現状はスタブ。本実装は別 PR で行う前提。
 * GBIZ_API_TOKEN 環境変数が未設定なら全関数 null を返す。
 */

const API_BASE = "https://info.gbiz.go.jp/hojin/v1/hojin"

export type GbizBasic = {
  corporateNumber: string
  name: string
  prefectureName?: string
  cityName?: string
  streetNumber?: string
  postalCode?: string
  businessSummary?: string
  businessItems?: string[]
  representativeName?: string
  capitalStock?: number
  employeeNumber?: number
  dateOfEstablishment?: string
  companyUrl?: string
  qualificationGrade?: string[] // 建設業許可等級
}

export type GbizCertification = {
  /** 認定種別 */
  name?: string
  /** 認定日 */
  date?: string
  /** 有効期限 */
  expiry?: string
  /** 認定機関 */
  authority?: string
  /** 詳細 */
  description?: string
}

export type GbizCommendation = {
  /** 表彰名（例: 健康経営優良法人 2025） */
  title?: string
  date?: string
  authority?: string
}

export type GbizSnapshot = {
  basic: GbizBasic | null
  certifications: GbizCertification[]
  commendations: GbizCommendation[]
  fetchedAt: string
}

/** API キーが設定済みかどうか。設定前は GbizINFO 機能は全 no-op。 */
export function isGbizConfigured(): boolean {
  return !!process.env.GBIZ_API_TOKEN
}

/** 13 桁の法人番号として妥当か（チェックデジット検証は省略・桁数のみ）。 */
export function isValidCorporateNumber(value: unknown): value is string {
  return typeof value === "string" && /^\d{13}$/.test(value)
}

async function get<T>(path: string): Promise<T | null> {
  if (!isGbizConfigured()) return null
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: {
        Accept: "application/json",
        "x-hojinInfo-api-token": process.env.GBIZ_API_TOKEN!,
      },
      // 法人情報は変動が少ないので 24h キャッシュ
      next: { revalidate: 60 * 60 * 24 },
    })
    if (!res.ok) return null
    return (await res.json()) as T
  } catch {
    return null
  }
}

/** 基本情報を取得（最小フィールドのみ） */
export async function fetchBasic(
  corporateNumber: string
): Promise<GbizBasic | null> {
  if (!isValidCorporateNumber(corporateNumber)) return null
  type Response = { "hojin-infos": Array<Record<string, unknown>> }
  const data = await get<Response>(`/${corporateNumber}`)
  const item = data?.["hojin-infos"]?.[0]
  if (!item) return null
  return {
    corporateNumber,
    name: String(item.name ?? ""),
    prefectureName: item.prefecture_name as string | undefined,
    cityName: item.city_name as string | undefined,
    streetNumber: item.street_number as string | undefined,
    postalCode: item.post_code as string | undefined,
    representativeName: item.representative_name as string | undefined,
    capitalStock: item.capital_stock as number | undefined,
    employeeNumber: item.employee_number as number | undefined,
    dateOfEstablishment: item.date_of_establishment as string | undefined,
    companyUrl: item.company_url as string | undefined,
    businessSummary: item.business_summary as string | undefined,
    businessItems: item.business_items as string[] | undefined,
    qualificationGrade: item.qualification_grade as string[] | undefined,
  }
}

/** 建設業許可等の認定情報を取得 */
export async function fetchCertifications(
  corporateNumber: string
): Promise<GbizCertification[]> {
  if (!isValidCorporateNumber(corporateNumber)) return []
  type Response = {
    "hojin-infos": Array<{ certification?: Array<Record<string, unknown>> }>
  }
  const data = await get<Response>(`/${corporateNumber}/certification`)
  const list = data?.["hojin-infos"]?.[0]?.certification ?? []
  return list.map((c) => ({
    name: c.name as string | undefined,
    date: c.date as string | undefined,
    expiry: c.expiry_date as string | undefined,
    authority: c.organization as string | undefined,
    description: c.title as string | undefined,
  }))
}

/** 表彰歴を取得 */
export async function fetchCommendations(
  corporateNumber: string
): Promise<GbizCommendation[]> {
  if (!isValidCorporateNumber(corporateNumber)) return []
  type Response = {
    "hojin-infos": Array<{ commendation?: Array<Record<string, unknown>> }>
  }
  const data = await get<Response>(`/${corporateNumber}/commendation`)
  const list = data?.["hojin-infos"]?.[0]?.commendation ?? []
  return list.map((c) => ({
    title: c.title as string | undefined,
    date: c.date as string | undefined,
    authority: c.target as string | undefined,
  }))
}

/** 基本情報 + 認定 + 表彰をまとめて取得（Company.gbizData にキャッシュする想定） */
export async function fetchSnapshot(
  corporateNumber: string
): Promise<GbizSnapshot | null> {
  if (!isGbizConfigured()) return null
  if (!isValidCorporateNumber(corporateNumber)) return null
  const [basic, certifications, commendations] = await Promise.all([
    fetchBasic(corporateNumber),
    fetchCertifications(corporateNumber),
    fetchCommendations(corporateNumber),
  ])
  if (!basic) return null
  return {
    basic,
    certifications,
    commendations,
    fetchedAt: new Date().toISOString(),
  }
}

/**
 * GbizINFO snapshot から建設業許可を抽出する。
 *
 * - basic.qualificationGrade: 「東京都知事許可（般-3）第12345号」のような文字列配列
 * - certifications[]: 「建設業許可」を含む title / name のもの
 */
export function extractConstructionPermits(snapshot: GbizSnapshot): string[] {
  const permits: string[] = []

  // 1) basic.qualificationGrade — 既に建設業許可の正規化文字列
  if (snapshot.basic?.qualificationGrade) {
    permits.push(...snapshot.basic.qualificationGrade.filter(Boolean))
  }

  // 2) certifications で「建設業」を含むもの
  for (const c of snapshot.certifications) {
    const label = c.description || c.name
    if (label && /建設業/.test(label)) {
      permits.push(label)
    }
  }

  // 重複除去
  return Array.from(new Set(permits))
}

/** snapshot が GbizINFO から取得した有効データかをチェック */
export function hasGbizData(snapshot: unknown): snapshot is GbizSnapshot {
  return (
    !!snapshot &&
    typeof snapshot === "object" &&
    "basic" in snapshot &&
    "fetchedAt" in snapshot
  )
}

/**
 * 任意の gbizData 値（JSONB / null / undefined）から「建設業許可保有か」を
 * 1 行で判定するヘルパー。
 *
 * 各 page.tsx の prisma クエリで company.gbizData を select しておき、
 * JobCard に渡す company の hasConstructionPermit に流し込む用途。
 */
export function computeHasConstructionPermit(gbizData: unknown): boolean {
  if (!hasGbizData(gbizData)) return false
  return extractConstructionPermits(gbizData).length > 0
}
