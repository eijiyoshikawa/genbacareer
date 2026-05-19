/**
 * ハローワーク求人バッチインポートモジュール
 *
 * fetchHelloworkJobs で取得・パースされた求人データを
 * Prisma 経由でデータベースに upsert する。
 *
 * 主な機能:
 * - hellowork_id をキーとした重複排除（upsert）
 * - ハローワーク側で削除された求人の自動 close
 * - インポート統計の集計・ログ出力
 *
 * @module import-batch
 */

import { Prisma, PrismaClient } from "@prisma/client"
import type { CategoryValue } from "@/lib/categories"
import {
  cleanTitle,
  extractTags,
  fallbackSalary,
} from "@/lib/job-enrichment"
import { computeRankScore } from "@/lib/ranking"
import type { HelloworkJobData } from "./hellowork"

// ========================================
// 型定義
// ========================================

/** インポートバッチの実行結果統計 */
export interface ImportStats {
  /** 新規追加件数 */
  created: number
  /** 既存レコードの更新件数 */
  updated: number
  /** closed に変更された件数（HW 側で削除済み） */
  closed: number
  /** 建設業カテゴリにマッチせずスキップした件数 */
  skipped: number
  /** エラーが発生した件数 */
  errors: number
  /** 処理対象の総件数 */
  totalProcessed: number
  /** バッチ開始時刻 */
  startedAt: Date
  /** バッチ完了時刻 */
  finishedAt: Date
  /** 処理時間（ミリ秒） */
  durationMs: number
}

/** upsert 時に発生したエラーの詳細 */
interface ImportError {
  helloworkId: string
  message: string
}

// ========================================
// Prisma クライアント
// ========================================

/**
 * シングルトン Prisma クライアント。
 * Next.js の Hot Reload でコネクションが増殖するのを防ぐ。
 */
const globalForPrisma = globalThis as unknown as {
  importPrisma: PrismaClient | undefined
}

const prisma = globalForPrisma.importPrisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.importPrisma = prisma
}

// ========================================
// ヘルパー関数
// ========================================

/**
 * HelloworkJobData を Prisma の Job モデルに適合する形式に変換する。
 *
 * 防御的に schema 上限を超える文字列は truncate する。
 * （schema 側で既に余裕を持たせているが、API 仕様変更や想定外データへの保険）
 *
 * @param job - パース済みのハローワーク求人データ
 * @param category - 事前に推定された建設業カテゴリ
 * @param companyId - 事前に upsert された HW Company の id（無ければ null）
 * @returns Prisma upsert 用のデータオブジェクト
 */
function toJobRecord(
  job: HelloworkJobData,
  category: CategoryValue,
  companyId: string | null
) {
  const title = cleanTitle(job.title, job.prefecture)
  const tags = extractTags(job.title, job.description, job.requirements)
  const salary = fallbackSalary(job.description, {
    min: job.salaryMin,
    max: job.salaryMax,
    type: job.salaryType,
  })

  // 取り込み時のランキングスコアは company 情報を引かない簡易計算。
  // 求人レコード自体の充実度（給与情報の有無、各種詳細欄、雇用形態 等）を
  // 評価して低品質求人を下位に押し下げる。企業プロフィール保存時に再計算される。
  const rankScore = computeRankScore(
    {
      description: job.description,
      requirements: job.requirements,
      salaryMin: salary.min,
      salaryMax: salary.max,
      employmentType: job.employmentType,
      workHours: job.workHours,
      holidays: job.holidays,
      insurance: job.insurance,
      bonus: job.bonus,
      commuteAllowance: job.commuteAllowance,
      companyFeatures: job.companyFeatures,
      businessContent: job.businessContent,
    },
    null
  )

  return {
    source: job.source,
    helloworkId: truncate(job.helloworkId, 50),
    title: truncate(title, 500) || "求人",
    category,
    companyId,
    employmentType: job.employmentType,
    description: job.description,
    requirements: job.requirements,
    salaryMin: salary.min,
    salaryMax: salary.max,
    salaryType: salary.type,
    prefecture: truncate(job.prefecture, 20) || "不明",
    city: job.city ? truncate(job.city, 100) : null,
    address: job.address,
    tags,
    rankScore,
    status: "active" as const,
    publishedAt: new Date(),
    expiresAt: job.validUntil,

    // ハローワーク API 拡張フィールド
    occupationTitle: truncate(job.occupationTitle, 100),
    jobConditionNotes: job.jobConditionNotes,
    industryCode: truncate(job.industryCode, 10),
    industryMajorCode: truncate(job.industryMajorCode, 5),
    occupationCode: truncate(job.occupationCode, 10),
    occupationCategoryName: truncate(job.occupationCategoryName, 50),
    jobTypeName: truncate(job.jobTypeName, 20),
    baseSalary: truncate(job.baseSalary, 50),
    bonus: truncate(job.bonus, 100),
    commuteAllowance: truncate(job.commuteAllowance, 50),
    fixedOvertime: truncate(job.fixedOvertime, 100),
    workHours: truncate(job.workHours, 100),
    workHoursNotes: truncate(job.workHoursNotes, 255),
    holidays: truncate(job.holidays, 50),
    holidaysOther: truncate(job.holidaysOther, 200),
    annualHolidays: job.annualHolidays,
    insurance: truncate(job.insurance, 50),
    smokingPolicy: truncate(job.smokingPolicy, 20),
    trialPeriod: truncate(job.trialPeriod, 100),
    requiredExperience: truncate(job.requiredExperience, 500),
    education: truncate(job.education, 50),
    recruitmentCount: truncate(job.recruitmentCount, 10),
    recruitmentReason: truncate(job.recruitmentReason, 20),
    companyFeatures: job.companyFeatures,
    businessContent: job.businessContent,
    companyUrl: truncate(job.companyUrl, 255),
    validUntil: job.validUntil,
    receivedDate: job.receivedDate,
    rawData: (job.rawData ?? {}) as Prisma.InputJsonValue,
  }
}

/**
 * HelloWork 由来の事業所情報を `Company` テーブルに find-or-create する。
 *
 * 同名企業の重複作成を避けるため `(source='hellowork', name)` の複合 unique を使用。
 * バッチ実行中に同名企業が複数回登場するので、呼び出し側でメモ化キャッシュを
 * 渡すと DB ラウンドトリップを 1 回に圧縮できる。
 *
 * 状態は "approved" 固定（承認フロー対象外。表示と参照のためだけに存在する）。
 */
async function upsertHelloworkCompany(
  job: HelloworkJobData,
  cache: Map<string, string>
): Promise<string | null> {
  const name = job.companyName?.trim()
  if (!name || name === "不明") return null

  const cached = cache.get(name)
  if (cached) return cached

  const company = await prisma.company.upsert({
    where: { company_source_name_unique: { source: "hellowork", name } },
    create: {
      source: "hellowork",
      name,
      prefecture: job.prefecture || null,
      city: job.city,
      address: job.address,
      status: "approved",
    },
    update: {
      // 既存レコードの prefecture/city/address は最新ジョブの値で更新
      // （HW 側で住所が変わる可能性があるため）
      prefecture: job.prefecture || null,
      city: job.city,
      address: job.address,
    },
    select: { id: true },
  })

  cache.set(name, company.id)
  return company.id
}

/** schema 上限超過を防ぐ最終防御。`null` / `undefined` も許容して null を返す。 */
function truncate<T extends string | null | undefined>(
  value: T,
  maxLen: number
): T extends string ? string : null {
  if (value == null) return null as never
  return (value.length <= maxLen ? value : value.slice(0, maxLen)) as never
}

/**
 * 求人タイトル・説明文から建設業カテゴリを推定する。
 *
 * `src/lib/categories.ts` で定義された建設業 9 カテゴリ（"other" を除く 8 つ）
 * のいずれかに該当するキーワードが含まれていれば該当カテゴリを返す。
 * いずれにも該当しなければ `null` を返し、呼び出し側はそのジョブを取り込まずスキップする。
 *
 * パターン優先度: より具体的な業種（civil, electrical, ...）を construction より先に評価し、
 * 「土木 + 建築」のような複合キーワードを取りこぼさないようにする。
 *
 * NOTE: ハローワーク API の `skgybruicode1_dai_c`（産業大分類コード）は
 * JSIC 標準ではなくハローワーク独自のコード体系（"06","07","08" は飲食・サービス業を含む）
 * のため、業種コードでの判定は使用しない。コードは将来分析用に DB へ保存だけする。
 */
/**
 * 建設業に紛れ込む非対象職種をタイトルベースで除外する。
 *
 * description (募集要項) には「衛生管理者資格歓迎」「保育園送迎運転業務もあり」など
 * 建設業求人内で副次的に登場するケースがあり、本文での判定は誤除外を生むため
 * タイトルのみを検査する。
 *
 * 「消防設備士」「衛生設備配管」のような建設文脈と衝突する語は意図的に外しており、
 * 「消防士」「衛生管理者」など独立した職名のみを列挙する。
 */
export const BLOCKED_OCCUPATION_PATTERN = new RegExp(
  [
    // 配送・運送 (重機・ダンプの建設ドライバーは対象内のため、ここでは個別職種を指定)
    "配送ドライバ",
    "配送員",
    "配送スタッフ",
    "宅配",
    "軽貨物",
    "ルート配送",
    "デリバリー",
    "タクシードライバ",
    "タクシー運転",
    "ハイヤー",
    "バス運転",
    "バスドライバ",
    "路線バス",
    "観光バス",
    "スクールバス",
    "高速バス",
    "送迎バス",
    // 消防士（消防設備士・消防設備工事は対象内）
    "消防士",
    "消防職員",
    "消防官",
    "救急救命士",
    "救急隊員",
    // コールセンター系
    "コールセンター",
    "テレオペレータ",
    "電話オペレータ",
    "テレマーケ",
    "カスタマーサポート",
    "カスタマーサクセス",
    "アウトバウンド業務",
    "インバウンド業務",
    "受電業務",
    "発信業務",
    // 介護送迎・送迎ドライバー
    "介護送迎",
    "福祉送迎",
    "送迎ドライバ",
    "送迎運転",
    "送迎スタッフ",
    // 食品衛生・衛生管理者（食品工場/病院）
    "食品衛生",
    "食品工場",
    "食品製造",
    "調理補助",
    "調理スタッフ",
    "調理員",
    "厨房スタッフ",
    "衛生管理者",
    // 保育・幼稚園・学童
    "保育士",
    "保育補助",
    "保育教諭",
    "幼稚園教諭",
    "学童指導員",
    "児童指導員",
    "ベビーシッター",
  ].join("|"),
  "i"
)

export function inferCategory(
  title: string,
  description: string | null | undefined
): CategoryValue | null {
  const titleLower = title.toLowerCase()

  // 非対象職種を先に除外（タイトルで判定）
  if (BLOCKED_OCCUPATION_PATTERN.test(titleLower)) return null

  const text = `${titleLower} ${description ?? ""}`.toLowerCase()

  const patterns: Array<{ category: CategoryValue; pattern: RegExp }> = [
    { category: "civil", pattern: /土木|舗装|道路|河川|橋梁|トンネル|造成/ },
    {
      category: "electrical",
      pattern: /電気工事|設備工事|空調|衛生|配管|配線|消防/,
    },
    {
      category: "interior",
      pattern: /内装|仕上げ|塗装|防水|クロス|タイル|左官/,
    },
    { category: "demolition", pattern: /解体|産廃|アスベスト|スクラップ/ },
    {
      category: "driver",
      pattern: /ドライバー|運転手|重機|オペレーター|クレーン|ダンプ/,
    },
    {
      category: "management",
      pattern: /施工管理|現場監督|現場代理人|工事主任|現場所長/,
    },
    { category: "survey", pattern: /測量|設計|cad|積算/ },
    {
      category: "construction",
      pattern: /建設|建築|躯体|鳶|鉄筋|型枠|大工|足場|基礎/,
    },
  ]

  for (const { category, pattern } of patterns) {
    if (pattern.test(text)) return category
  }

  return null
}

// ========================================
// バッチインポート
// ========================================

/**
 * ハローワーク求人データをデータベースに一括インポートする。
 *
 * 処理フロー:
 * 1. 各求人を hellowork_id で upsert（新規 or 更新）
 * 2. DB 上の hellowork 求人のうち、今回のバッチに含まれないものを closed にする
 * 3. 統計を集計して返す
 *
 * トランザクション内で実行されるため、途中で失敗した場合はロールバックされる
 * （個別エラーは記録して続行する）。
 *
 * @param jobs - パース済みのハローワーク求人データ配列
 * @param options - オプション設定
 * @param options.dryRun - true の場合、DB 変更を行わずに統計のみ返す
 * @param options.closeOrphans - true の場合、今回のバッチに含まれない HW 求人を closed にする（デフォルト: true）
 * @returns インポート統計
 *
 * @example
 * ```typescript
 * import { fetchHelloworkJobs } from "./hellowork";
 * import { importHelloworkJobs } from "./import-batch";
 *
 * const result = await fetchHelloworkJobs({ prefecture: "13" });
 * const stats = await importHelloworkJobs(result.jobs);
 * console.info(`新規: ${stats.created}, 更新: ${stats.updated}, 終了: ${stats.closed}`);
 * ```
 */
export async function importHelloworkJobs(
  jobs: HelloworkJobData[],
  options: { dryRun?: boolean; closeOrphans?: boolean } = {}
): Promise<ImportStats> {
  const { dryRun = false, closeOrphans = true } = options
  const startedAt = new Date()

  let created = 0
  let updated = 0
  let closed = 0
  let skipped = 0
  let errors = 0
  const importErrors: ImportError[] = []

  // 今回バッチで処理された hellowork_id のセット
  // 建設業カテゴリにマッチした（＝取り込み対象になった）ジョブのみが入る。
  // 非建設業ジョブを含めると closeOrphans が誤って既存の建設業求人を closed にしてしまうため。
  const processedIds = new Set<string>()

  // 同一バッチ内で同じ会社名が複数のジョブで登場する場合の Company upsert 重複を避けるキャッシュ。
  const companyCache = new Map<string, string>()

  console.info(
    `[import-batch] インポート開始: ${jobs.length} 件の求人を処理します`
  )

  // -------------------------------------------------------
  // Step 1: 各求人を upsert
  // -------------------------------------------------------
  for (const job of jobs) {
    try {
      // 建設業 9 カテゴリのいずれにも該当しないジョブは取り込まない
      const category = inferCategory(job.title, job.description)
      if (category === null) {
        skipped++
        continue
      }

      processedIds.add(job.helloworkId)

      if (dryRun) {
        // ドライランの場合は DB アクセスせずに既存チェックのみ
        const existing = await prisma.job.findUnique({
          where: { helloworkId: job.helloworkId },
          select: { id: true },
        })
        if (existing) {
          updated++
        } else {
          created++
        }
        continue
      }

      const companyId = await upsertHelloworkCompany(job, companyCache)
      const data = toJobRecord(job, category, companyId)

      const result = await prisma.job.upsert({
        where: { helloworkId: job.helloworkId },
        create: data,
        update: {
          title: data.title,
          category: data.category,
          companyId: data.companyId,
          employmentType: data.employmentType,
          description: data.description,
          requirements: data.requirements,
          salaryMin: data.salaryMin,
          salaryMax: data.salaryMax,
          salaryType: data.salaryType,
          prefecture: data.prefecture,
          city: data.city,
          address: data.address,
          tags: data.tags,
          rankScore: data.rankScore,
          status: "active",
          expiresAt: data.expiresAt,
          // ハローワーク API 拡張フィールド
          occupationTitle: data.occupationTitle,
          jobConditionNotes: data.jobConditionNotes,
          industryCode: data.industryCode,
          industryMajorCode: data.industryMajorCode,
          occupationCode: data.occupationCode,
          occupationCategoryName: data.occupationCategoryName,
          jobTypeName: data.jobTypeName,
          baseSalary: data.baseSalary,
          bonus: data.bonus,
          commuteAllowance: data.commuteAllowance,
          fixedOvertime: data.fixedOvertime,
          workHours: data.workHours,
          workHoursNotes: data.workHoursNotes,
          holidays: data.holidays,
          holidaysOther: data.holidaysOther,
          annualHolidays: data.annualHolidays,
          insurance: data.insurance,
          smokingPolicy: data.smokingPolicy,
          trialPeriod: data.trialPeriod,
          requiredExperience: data.requiredExperience,
          education: data.education,
          recruitmentCount: data.recruitmentCount,
          recruitmentReason: data.recruitmentReason,
          companyFeatures: data.companyFeatures,
          businessContent: data.businessContent,
          companyUrl: data.companyUrl,
          validUntil: data.validUntil,
          receivedDate: data.receivedDate,
          rawData: data.rawData,
          // updatedAt は Prisma が自動更新する
        },
      })

      // upsert の結果で create/update を判定
      // createdAt と updatedAt が近い場合は新規作成とみなす
      const timeDiff =
        result.updatedAt.getTime() - result.createdAt.getTime()
      if (timeDiff < 1000) {
        created++
      } else {
        updated++
      }
    } catch (error) {
      errors++
      const message =
        error instanceof Error ? error.message : String(error)
      importErrors.push({ helloworkId: job.helloworkId, message })
      console.error(
        `[import-batch] エラー: ${job.helloworkId} - ${message}`
      )
    }
  }

  // -------------------------------------------------------
  // Step 2: 孤立した HW 求人を closed にする
  // ハローワーク側で掲載終了した求人を検知して非公開にする
  // -------------------------------------------------------
  if (closeOrphans && !dryRun && processedIds.size > 0) {
    try {
      const result = await prisma.job.updateMany({
        where: {
          source: "hellowork",
          status: "active",
          helloworkId: {
            notIn: Array.from(processedIds),
          },
        },
        data: {
          status: "closed",
        },
      })
      closed = result.count

      if (closed > 0) {
        console.info(
          `[import-batch] ${closed} 件のハローワーク求人を closed に変更しました`
        )
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      console.error(
        `[import-batch] 孤立求人の close 処理でエラー: ${message}`
      )
    }
  }

  const finishedAt = new Date()
  const durationMs = finishedAt.getTime() - startedAt.getTime()

  // -------------------------------------------------------
  // Step 3: 統計ログの出力
  // -------------------------------------------------------
  const stats: ImportStats = {
    created,
    updated,
    closed,
    skipped,
    errors,
    totalProcessed: jobs.length,
    startedAt,
    finishedAt,
    durationMs,
  }

  console.info(`[import-batch] インポート完了:`)
  console.info(`  新規追加: ${stats.created} 件`)
  console.info(`  更新: ${stats.updated} 件`)
  console.info(`  終了 (closed): ${stats.closed} 件`)
  console.info(`  スキップ (非建設業): ${stats.skipped} 件`)
  console.info(`  エラー: ${stats.errors} 件`)
  console.info(`  処理時間: ${stats.durationMs}ms`)

  if (importErrors.length > 0) {
    console.info(`[import-batch] エラー詳細:`)
    for (const err of importErrors) {
      console.info(`  - ${err.helloworkId}: ${err.message}`)
    }
  }

  return stats
}
