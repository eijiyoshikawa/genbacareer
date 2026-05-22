/**
 * ハローワーク求人情報提供 API クライアント
 *
 * 厚生労働省「ハローワーク求人・求職情報提供サービス」の公式 API を呼び出し、
 * XML レスポンスをパースして構造化データに変換するモジュール。
 *
 * 公式 API ベース URL: https://teikyo.hellowork.mhlw.go.jp/teikyo/api/2.0/
 *
 * 利用フロー:
 *   1. getToken(id, pass) でトークン発行
 *   2. fetchKyujinIdList(token) でデータ ID リストを取得
 *   3. fetchKyujinByDataId(token, dataId, page) で求人 XML を取得（最大1,000件/ページ）
 *   4. delToken(token) でトークン破棄
 *
 * トークンは発行当日のみ有効。日跨ぎで再発行が必要。
 *
 * @module hellowork-api
 */

import { XMLParser } from "fast-xml-parser"

// ========================================
// 型定義（import-batch.ts と互換維持）
// ========================================

/** API 用の認証情報 */
export interface HelloworkCredentials {
  id: string
  pass: string
}

/** ハローワーク API からパースされた求人データ */
export interface HelloworkJobData {
  helloworkId: string
  title: string
  companyName: string
  salaryMin: number | null
  salaryMax: number | null
  salaryType: "monthly" | "hourly" | "annual" | "daily" | null
  prefecture: string
  city: string | null
  address: string | null
  employmentType: "full_time" | "part_time" | "contract" | null
  description: string | null
  requirements: string | null
  source: "hellowork"
  attribution: string

  // ハローワーク API 拡張フィールド
  occupationTitle: string | null
  jobConditionNotes: string | null
  industryCode: string | null
  industryMajorCode: string | null
  occupationCode: string | null
  occupationCategoryName: string | null
  jobTypeName: string | null
  baseSalary: string | null
  bonus: string | null
  commuteAllowance: string | null
  fixedOvertime: string | null
  workHours: string | null
  workHoursNotes: string | null
  holidays: string | null
  holidaysOther: string | null
  annualHolidays: number | null
  insurance: string | null
  smokingPolicy: string | null
  trialPeriod: string | null
  requiredExperience: string | null
  education: string | null
  recruitmentCount: string | null
  recruitmentReason: string | null
  companyFeatures: string | null
  businessContent: string | null
  companyUrl: string | null
  validUntil: Date | null
  receivedDate: Date | null
  /** 個別カラムに抽出していない全 API タグ（未加工値） */
  rawData: Record<string, unknown>
}

/** 個別カラム化済みの API タグ。`rawData` ではここに無いタグだけを残す。 */
const EXTRACTED_TAGS = new Set([
  "kjno",
  "shigoto_ny",
  "jgshmei",
  "koyokeitai_n",
  "koyokeitai_c",
  "shgbsjusho",
  "jgshjusho_n",
  "shgbsjusho1_n",
  "chgnkeitai_kagen",
  "chgnkeitai_jgn",
  "chgnkeitai",
  "menkyo_skku3_n",
  "sksu",
  "kjjknktkjk",
  "skgybrui1_c",
  "skgybruicode1_dai_c",
  "sngbrui_c",
  "sngbrui_n",
  "kjkbn1_n",
  "khky",
  "shoyo",
  "tskntat",
  "ktizangydi",
  "shgjn",
  "shgjn_tkjk",
  "kyjs",
  "kyjstosnta",
  "nenkankjsu_n",
  "knyhkn",
  "okni_jdktentisk_n",
  "sykkn",
  "hynakiknt",
  "grki",
  "saiyoninzu_n",
  "boshury_n",
  "kaishatokucho",
  "jigyony",
  "jgshhp",
  "kjyukoymd",
  "uktkymd_seireki",
])

/** クローラーの取得結果 */
export interface CrawlResult {
  jobs: HelloworkJobData[]
  totalCount: number
  currentPage: number
  totalPages: number
  crawledAt: Date
}

// ========================================
// 定数
// ========================================

const DEFAULT_API_BASE =
  "https://teikyo.hellowork.mhlw.go.jp/teikyo/api/2.0"

const ATTRIBUTION =
  "出典: ハローワーク求人・求職情報提供サービス (https://teikyo.hellowork.mhlw.go.jp)"

const REQUEST_INTERVAL_MS = 1000

function getApiBase(): string {
  return process.env.HELLOWORK_API_BASE ?? DEFAULT_API_BASE
}

// ========================================
// レート制限
// ========================================

let lastRequestTime = 0

async function enforceRateLimit(): Promise<void> {
  const now = Date.now()
  const elapsed = now - lastRequestTime
  if (elapsed < REQUEST_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, REQUEST_INTERVAL_MS - elapsed))
  }
  lastRequestTime = Date.now()
}

// ========================================
// HTTP ユーティリティ
// ========================================

async function postForm(
  url: string,
  params: Record<string, string>
): Promise<string> {
  await enforceRateLimit()

  const body = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) body.append(k, v)

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    throw new Error(
      `HelloWork API リクエスト失敗: ${res.status} ${res.statusText} (${url})`
    )
  }
  return await res.text()
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
  parseTagValue: false,
})

function parseXml<T = unknown>(xml: string): T {
  return xmlParser.parse(xml) as T
}

// ========================================
// 認証
// ========================================

/**
 * トークン発行 (POST /auth/getToken)
 */
export async function getToken(creds: HelloworkCredentials): Promise<string> {
  const xml = await postForm(`${getApiBase()}/auth/getToken`, {
    id: creds.id,
    pass: creds.pass,
  })
  const parsed = parseXml<Record<string, unknown>>(xml)
  const token = extractToken(parsed)
  if (!token) {
    throw new Error(
      `トークン取得に失敗: レスポンスから token を抽出できません: ${xml.slice(0, 200)}`
    )
  }
  return token
}

/**
 * <root><token>...</token></root> 構造から token を抽出する。
 * フォールバックとして、十分な長さ (>=16) の文字列値を再帰探索する。
 */
function extractToken(parsed: unknown): string | null {
  const direct = (parsed as { root?: { token?: unknown } } | null)?.root?.token
  if (typeof direct === "string" && direct.trim()) return direct.trim()

  let best: string | null = null
  walk(parsed)
  return best
  function walk(n: unknown): void {
    if (!n || typeof n !== "object") return
    if (Array.isArray(n)) {
      n.forEach(walk)
      return
    }
    for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
      if (k.startsWith("?")) continue
      if (typeof v === "string") {
        const t = v.trim()
        if (t.length >= 16 && (!best || t.length > best.length)) best = t
      } else if (typeof v === "object") {
        walk(v)
      }
    }
  }
}

/**
 * トークン破棄 (POST /auth/delToken)
 */
export async function delToken(token: string): Promise<void> {
  await postForm(`${getApiBase()}/auth/delToken`, { token })
}

// ========================================
// 求人データ取得
// ========================================

/**
 * 求人一覧データID取得 (POST /kyujin)
 * 求人情報データの取得が可能なデータ ID のリストを返す。
 */
export async function fetchKyujinIdList(token: string): Promise<string[]> {
  const xml = await postForm(`${getApiBase()}/kyujin`, { token })
  const parsed = parseXml<Record<string, unknown>>(xml)
  return collectStrings(parsed, /^(data_id|dataId|id)$/i)
}

/**
 * 指定求人データ取得 (POST /kyujin/{dataId}/{page})
 * 指定したデータ ID に紐づく求人情報（最大1,000件/ページ）を取得する。
 *
 * dataId のページ範囲を超えた page 番号を指定すると HelloWork API は 404 を返す。
 * これは「データが空」と等価のシグナルなので空配列に正規化し、
 * 呼び出し元 (`fetchPagesFromDataId`) で `exhausted=true` 判定に委ねる。
 */
export async function fetchKyujinByDataId(
  token: string,
  dataId: string,
  page = 1
): Promise<HelloworkJobData[]> {
  try {
    const xml = await postForm(
      `${getApiBase()}/kyujin/${encodeURIComponent(dataId)}/${page}`,
      { token }
    )
    const parsed = parseXml<Record<string, unknown>>(xml)
    return parseJobsFromKyujinXml(parsed)
  } catch (err) {
    if (err instanceof Error && /\b404\b/.test(err.message)) {
      return []
    }
    throw err
  }
}

// ========================================
// XML パース
// ========================================

function collectStrings(node: unknown, keyPattern: RegExp): string[] {
  const out: string[] = []
  walk(node)
  return out
  function walk(n: unknown): void {
    if (!n || typeof n !== "object") return
    if (Array.isArray(n)) {
      n.forEach(walk)
      return
    }
    for (const [k, v] of Object.entries(n as Record<string, unknown>)) {
      if (keyPattern.test(k)) {
        if (typeof v === "string" && v.trim()) out.push(v.trim())
        else if (Array.isArray(v)) {
          for (const item of v) {
            if (typeof item === "string" && item.trim()) out.push(item.trim())
          }
        }
      }
      walk(v)
    }
  }
}

/**
 * /kyujin/{dataId}/{page} レスポンスから求人レコード配列を抽出する。
 * 想定構造: <root><kyujin><data>...</data><data>...</data></kyujin></root>
 */
function parseJobsFromKyujinXml(parsed: unknown): HelloworkJobData[] {
  const dataNode = (parsed as { root?: { kyujin?: { data?: unknown } } } | null)
    ?.root?.kyujin?.data
  if (!dataNode) return []
  const records = Array.isArray(dataNode) ? dataNode : [dataNode]
  return records
    .map((r) => toHelloworkJobData(r as Record<string, unknown>))
    .filter((j): j is HelloworkJobData => j !== null)
}

function toHelloworkJobData(
  record: Record<string, unknown>
): HelloworkJobData | null {
  const helloworkId = str(record.kjno)
  if (!helloworkId) return null

  const description = str(record.shigoto_ny)
  const companyName = str(record.jgshmei) ?? "不明"
  const employmentType = parseEmploymentType(str(record.koyokeitai_n) ?? "")
  const address =
    str(record.shgbsjusho) ?? str(record.jgshjusho_n) ?? null

  // 都道府県・市区町村は shgbsjusho1_n → shgbsjusho → jgshjusho_n の順でフォールバック
  const locText =
    str(record.shgbsjusho1_n) ??
    str(record.shgbsjusho) ??
    str(record.jgshjusho_n)
  const { prefecture, city } = splitPrefectureCity(locText)

  const salaryMin = numericOrNull(record.chgnkeitai_kagen)
  const salaryMax = numericOrNull(record.chgnkeitai_jgn)
  const salaryType =
    inferSalaryType(str(record.chgnkeitai)) ??
    inferSalaryTypeFromAmount(salaryMin ?? salaryMax)

  const requirements = str(record.menkyo_skku3_n)

  // 職種名 (sksu) を title に採用。無ければ仕事内容の冒頭を流用。
  const occupationTitle = str(record.sksu)
  const title = occupationTitle ?? (description ? description.slice(0, 80) : "求人")

  // 拡張フィールド抽出
  const rawData: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(record)) {
    if (!EXTRACTED_TAGS.has(k)) rawData[k] = v
  }

  return {
    helloworkId,
    title,
    companyName,
    salaryMin,
    salaryMax,
    salaryType,
    prefecture,
    city,
    address,
    employmentType,
    description,
    requirements,
    source: "hellowork",
    attribution: ATTRIBUTION,

    occupationTitle,
    jobConditionNotes: str(record.kjjknktkjk),
    industryCode: str(record.skgybrui1_c),
    industryMajorCode: str(record.skgybruicode1_dai_c),
    occupationCode: str(record.sngbrui_c),
    occupationCategoryName: str(record.sngbrui_n),
    jobTypeName: str(record.kjkbn1_n),
    baseSalary: str(record.khky),
    bonus: str(record.shoyo),
    commuteAllowance: str(record.tskntat),
    fixedOvertime: str(record.ktizangydi),
    workHours: str(record.shgjn),
    workHoursNotes: str(record.shgjn_tkjk),
    holidays: str(record.kyjs),
    holidaysOther: str(record.kyjstosnta),
    annualHolidays: numericOrNull(record.nenkankjsu_n),
    insurance: str(record.knyhkn),
    smokingPolicy: str(record.okni_jdktentisk_n),
    trialPeriod: str(record.sykkn),
    requiredExperience: str(record.hynakiknt),
    education: str(record.grki),
    recruitmentCount: str(record.saiyoninzu_n),
    recruitmentReason: str(record.boshury_n),
    companyFeatures: str(record.kaishatokucho),
    businessContent: str(record.jigyony),
    companyUrl: str(record.jgshhp),
    validUntil: parseDate(str(record.kjyukoymd)),
    receivedDate: parseDate(str(record.uktkymd_seireki)),
    rawData,
  }
}

/** "YYYY-MM-DD" / "YYYYMMDD" / "YYYY/MM/DD" を Date に変換。失敗時は null。 */
function parseDate(s: string | null): Date | null {
  if (!s) return null
  // 区切り文字を統一して 8 桁の数字を抽出
  const digits = s.replace(/\D/g, "")
  if (digits.length !== 8) return null
  const y = parseInt(digits.slice(0, 4), 10)
  const m = parseInt(digits.slice(4, 6), 10)
  const d = parseInt(digits.slice(6, 8), 10)
  if (!y || !m || !d) return null
  const date = new Date(Date.UTC(y, m - 1, d))
  return isNaN(date.getTime()) ? null : date
}

// ========================================
// 値ヘルパー
// ========================================

function str(v: unknown): string | null {
  if (typeof v === "string") {
    const t = v.trim()
    return t || null
  }
  if (typeof v === "number") return String(v)
  return null
}

function numericOrNull(v: unknown): number | null {
  const s = str(v)
  if (!s) return null
  const cleaned = s.replace(/,/g, "").replace(/，/g, "")
  const m = cleaned.match(/-?\d+/)
  if (!m) return null
  const n = parseInt(m[0], 10)
  return isNaN(n) ? null : n
}

function inferSalaryType(
  formatText: string | null
): "monthly" | "hourly" | "annual" | "daily" | null {
  if (!formatText) return null
  if (/月給|月額/.test(formatText)) return "monthly"
  if (/時給|時間額/.test(formatText)) return "hourly"
  if (/年俸|年額|年収/.test(formatText)) return "annual"
  if (/日給|日額/.test(formatText)) return "daily"
  return null
}

/**
 * 賃金タグから種別が判定できないとき、金額レンジから推定する。
 * 凡そのレンジ:
 *   - 時給: 〜 5,000 円
 *   - 日給: 5,000 〜 30,000 円
 *   - 月給: 30,000 〜 1,500,000 円
 *   - 年俸: 1,500,000 円以上
 */
function inferSalaryTypeFromAmount(
  amount: number | null
): "monthly" | "hourly" | "annual" | "daily" | null {
  if (amount === null || amount <= 0) return null
  if (amount < 5_000) return "hourly"
  if (amount < 30_000) return "daily"
  if (amount < 1_500_000) return "monthly"
  return "annual"
}

/** 全 47 都道府県名（正式表記）。`splitPrefectureCity` のフォールバック検索に使う。 */
const ALL_PREFECTURES = [
  "北海道",
  "青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県",
  "茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県",
  "新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県",
  "岐阜県", "静岡県", "愛知県", "三重県",
  "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県",
  "鳥取県", "島根県", "岡山県", "広島県", "山口県",
  "徳島県", "香川県", "愛媛県", "高知県",
  "福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県",
] as const

export function splitPrefectureCity(text: string | null): {
  prefecture: string
  city: string | null
} {
  if (!text) return { prefecture: "不明", city: null }

  // 1) 先頭が都道府県プレフィックスにマッチする標準形式
  const head = text.match(/^(北海道|東京都|(?:大阪|京都)府|.{2,3}県)(.*)$/)
  if (head) {
    const city = head[2].trim()
    return { prefecture: head[1], city: city || null }
  }

  // 2) 〒xxx-xxxx や全角空白で先頭が崩れているケースを救済：
  //    住所文字列のどこかに 47 都道府県名が含まれていれば抽出する
  for (const pref of ALL_PREFECTURES) {
    const idx = text.indexOf(pref)
    if (idx >= 0) {
      const after = text.slice(idx + pref.length).trim()
      return { prefecture: pref, city: after || null }
    }
  }

  // 3) 都道府県を一切特定できない場合は city に原文（先頭 100 字）を残し、
  //    prefecture は "不明" にする。これにより VarChar(20) を絶対超えない。
  return {
    prefecture: "不明",
    city: text.slice(0, 100) || null,
  }
}

function parseEmploymentType(
  text: string
): "full_time" | "part_time" | "contract" | null {
  if (!text) return null
  if (/正社員|正規/.test(text)) return "full_time"
  if (/パート|アルバイト|短時間/.test(text)) return "part_time"
  if (/契約|有期|派遣|臨時|嘱託/.test(text)) return "contract"
  return null
}

// ========================================
// 後方互換: 旧 parseSalary を残す（テキスト→数値変換用）
// ========================================

export function parseSalary(salaryText: string): {
  min: number | null
  max: number | null
  type: "monthly" | "hourly" | "annual" | "daily" | null
} {
  if (!salaryText) return { min: null, max: null, type: null }
  const normalized = salaryText.replace(/,/g, "").replace(/，/g, "")
  const type = inferSalaryType(normalized)
  const numbers = normalized.match(/(\d+)/g)
  if (!numbers || numbers.length === 0) return { min: null, max: null, type }
  const min = parseInt(numbers[0], 10)
  const max = numbers.length > 1 ? parseInt(numbers[1], 10) : null
  return { min, max, type }
}

// ========================================
// オーケストレーション
// ========================================

/**
 * ID/パスから全求人を取得する高レベル関数。
 *   1. getToken
 *   2. fetchKyujinIdList
 *   3. 各 dataId について fetchKyujinByDataId をページングしながら取得
 *   4. delToken
 *
 * @param creds - API 認証情報。省略時は環境変数から取得
 * @param options.maxPagesPerDataId - 各 dataId あたりの最大ページ数（デフォルト: 50）
 * @param options.maxJobs - 取得する求人の上限（デフォルト: 無制限）
 */
export async function fetchAllJobs(
  creds?: HelloworkCredentials,
  options: { maxPagesPerDataId?: number; maxJobs?: number } = {}
): Promise<CrawlResult> {
  const { maxPagesPerDataId = 50, maxJobs = Infinity } = options
  const credentials = creds ?? readCredentialsFromEnv()
  const token = await getToken(credentials)

  try {
    const dataIds = await fetchKyujinIdList(token)
    const allJobs: HelloworkJobData[] = []

    outer: for (const dataId of dataIds) {
      for (let page = 1; page <= maxPagesPerDataId; page++) {
        const jobs = await fetchKyujinByDataId(token, dataId, page)
        if (jobs.length === 0) break
        allJobs.push(...jobs)
        if (allJobs.length >= maxJobs) {
          allJobs.length = maxJobs
          break outer
        }
      }
    }

    return {
      jobs: allJobs,
      totalCount: allJobs.length,
      currentPage: 1,
      totalPages: 1,
      crawledAt: new Date(),
    }
  } finally {
    try {
      await delToken(token)
    } catch (e) {
      console.error(
        `[hellowork] トークン破棄に失敗: ${e instanceof Error ? e.message : e}`
      )
    }
  }
}

/**
 * 指定 dataId の指定ページから連続で N ページ分だけ取得する。
 * 全国36万件取り込みのページローテーション戦略で使用する。
 *
 * @returns
 *   - jobs: 取得できた求人配列
 *   - lastPage: 実際に最後まで取れたページ番号（0 件ページに当たった直前のページ）
 *   - exhausted: 0 件ページに到達したか（= この dataId の取り尽くし完了）
 */
export async function fetchPagesFromDataId(
  token: string,
  dataId: string,
  startPage: number,
  pageCount: number
): Promise<{
  jobs: HelloworkJobData[]
  lastPage: number
  exhausted: boolean
}> {
  const allJobs: HelloworkJobData[] = []
  let lastPage = startPage - 1
  let exhausted = false

  for (let i = 0; i < pageCount; i++) {
    const page = startPage + i
    const jobs = await fetchKyujinByDataId(token, dataId, page)
    if (jobs.length === 0) {
      exhausted = true
      break
    }
    allJobs.push(...jobs)
    lastPage = page
  }

  return { jobs: allJobs, lastPage, exhausted }
}

/**
 * dataId リストのみを取得する軽量ヘルパー（getToken / delToken 含む）。
 * 進捗テーブルの初期化用。
 */
export async function fetchDataIds(
  creds?: HelloworkCredentials
): Promise<string[]> {
  const credentials = creds ?? readCredentialsFromEnv()
  const token = await getToken(credentials)
  try {
    return await fetchKyujinIdList(token)
  } finally {
    try {
      await delToken(token)
    } catch (e) {
      console.error(
        `[hellowork] トークン破棄に失敗: ${e instanceof Error ? e.message : e}`
      )
    }
  }
}

function readCredentialsFromEnv(): HelloworkCredentials {
  const id = process.env.HELLOWORK_API_USER
  const pass = process.env.HELLOWORK_API_PASS
  if (!id || !pass) {
    throw new Error(
      "HelloWork API 認証情報が未設定: HELLOWORK_API_USER / HELLOWORK_API_PASS を環境変数に設定してください"
    )
  }
  return { id, pass }
}
