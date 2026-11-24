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
import { computeDisplayPriority } from "@/lib/job-display-priority"
import { normalizeCompanyName } from "@/lib/company-name"
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
  companyId: string | null,
  /** 既存行の実際の公開日 / 閲覧数 (再取り込み時)。新規は未指定 */
  existing?: { publishedAt: Date | null; viewCount: number | null }
) {
  const title = cleanTitle(job.title, job.prefecture)
  const tags = extractTags(job.title, job.description, job.requirements)
  const salary = fallbackSalary(job.description, {
    min: job.salaryMin,
    max: job.salaryMax,
    type: job.salaryType,
  })

  // 取り込み時のランキングスコアは company 情報を引かない簡易計算。
  // 求人レコード自体の充実度（給与情報の有無、各種詳細欄、雇用形態 等）と
  // 時間軸シグナル（新着 / 期限切れ間近）を評価して低品質求人を下位に押し下げる。
  // 企業プロフィール保存時に再計算される。新着/期限の鮮度は日次 cron で再計算推奨。
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
      // 再取り込みでは実際の公開日を使う。毎回「今」で計算すると、公開から
      // 何週間も経った求人が取り込みの度に新着ボーナスを得て、本当の新着より
      // 上に並び続けていた。
      publishedAt: existing?.publishedAt ?? new Date(),
      viewCount: existing?.viewCount ?? undefined,
      expiresAt: job.validUntil,
    },
    null
  )

  const displayPriority = computeDisplayPriority({
    source: job.source,
    salaryType: salary.type,
    salaryMin: salary.min,
    salaryMax: salary.max,
    employmentType: job.employmentType,
    workHours: job.workHours,
    workHoursNotes: job.workHoursNotes,
    holidays: job.holidays,
    annualHolidays: job.annualHolidays,
    insurance: job.insurance,
    smokingPolicy: job.smokingPolicy,
    trialPeriod: job.trialPeriod,
    description: job.description,
    prefecture: job.prefecture,
  })

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
    displayPriority,
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
  // Company.name/prefecture/city は Job 側より厳しい上限 (200/10/50) なので、
  // truncate() は Job 用の値ではなく Company 側の上限で改めてかけ直す。
  // これを怠ると "value too long for column" で upsert 自体が失敗し、
  // そのジョブ (と後続の同名企業ぶん) がまるごとインポートされなくなる。
  const name = truncate(normalizeCompanyName(job.companyName), 200)
  if (!name || name === "不明") return null

  const cached = cache.get(name)
  if (cached) return cached

  const prefecture = truncate(job.prefecture || null, 10)
  const city = truncate(job.city, 50)

  const company = await prisma.company.upsert({
    where: { company_source_name_unique: { source: "hellowork", name } },
    create: {
      source: "hellowork",
      name,
      prefecture,
      city,
      address: job.address,
      status: "approved",
      // 列の既定値 3 は有料プラン相当。HW 企業は 0 (src/lib/plans.ts の方針)。
      // 省略していたため、新しく取り込まれた HW 企業の求人が「おすすめ順」で
      // 既存の HW 企業の求人より常に上に並んでいた。
      planTier: 0,
    },
    update: {
      // 既存レコードの prefecture/city/address は最新ジョブの値で更新
      // （HW 側で住所が変わる可能性があるため）
      prefecture,
      city,
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
 *
 * IT 系は「システム」単独だと「空調システム」「配管システム」等と衝突するため、
 * 「システムエンジニア」「システム設計」のような複合語のみを列挙する。
 */
export const BLOCKED_OCCUPATION_PATTERN = new RegExp(
  [
    // 保険・金融・不動産の営業職（説明文に「建設業のお客様向け」等があると
    // キーワード判定をすり抜けるため、職種名レベルで遮断する）
    "保険営業",
    "生命保険",
    "損害保険",
    "生保レディ",
    "生保営業",
    "損保営業",
    "保険外交",
    "保険募集",
    "保険代理",
    "保険アドバイザ",
    "共済.{0,6}(営業|推進|普及)",
    "ライフプランナ",
    "ファイナンシャルプランナ",
    "証券営業",
    "銀行員",
    "信用金庫",
    "ローン営業",
    "クレジットカード",
    "不動産営業",
    "不動産売買",
    "不動産仲介",
    "賃貸仲介",
    "投資用マンション",
    // 非建設の運送業（建設資材・重機系ドライバーは inferCategory 側の
    // 文脈判定で対象内として残る）
    "引越",
    "引っ越し",
    "宅配便",
    "チャーター便",
    "フードデリバリ",
    "バイク便",
    "新聞配達",
    "郵便配達",
    "陸送",
    "カーキャリア",
    "霊柩",
    // 自動車整備・自動車板金（建築板金は対象内のため「板金」単独は入れない。
    // タイトルが「板金工」だけの曖昧ケースは inferCategory 側で本文から判別）
    "自動車板金",
    "自動車鈑金",
    "鈑金",
    // 「板金・塗装」「板金/塗装」等の区切り付き表記も自動車系として捕捉
    // （建築板金は通常「建築板金」「屋根板金」表記のため巻き込まない）
    "板金.{0,3}塗装",
    // 工場の金属加工系（建設対象外）
    "精密板金",
    "製缶板金",
    "粉体塗装",
    "自動車整備",
    "車体整備",
    "車両整備",
    "カーコーティング",
    "カー用品",
    "洗車スタッフ",
    "自動車検査",
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
    // 介護・福祉（入居者・見守り・介助を含む施設系の求人）
    // NOTE: 「介護」「老人ホーム」のような単独/施設名は誤ブロックを生む
    // （例: 「老人ホーム新築の鳶職人」「介護施設の電気工事士」は対象内）。
    // ここでは **職務名・業務内容** に限定してブロックする。
    "介護スタッフ",
    "介護職員",
    "介護職",
    "介護員",
    "介助業務",
    "介助スタッフ",
    "訪問介護",
    "ホームヘルパ",
    "看護助手",
    "看護補助",
    "介護福祉士",
    "入居者",
    "見守り業務",
    // 障害福祉・児童発達支援
    "障害児",
    "障害者支援",
    "児童発達",
    "発達支援",
    "放課後等デイ",
    "放課後デイ",
    "通所支援",
    "通所介護",
    "デイサービス",
    "デイケア",
    "療育",
    // 教育・塾・学校
    "塾講師",
    "学習塾",
    "家庭教師",
    "教員募集",
    "学校事務",
    "スクール講師",
    // 美容・理容・エステ
    "美容師",
    "理容師",
    "ネイリスト",
    "エステティシャン",
    "アイリスト",
    "セラピスト",
    // 接客・販売・飲食ホール
    "販売スタッフ",
    "アパレル販売",
    "ホール業務",
    "ホールスタッフ",
    "接客販売",
    "レジ業務",
    "レジスタッフ",
    // 医療事務・薬局
    "医療事務",
    "調剤事務",
    "薬剤師",
    // 歯科・口腔（「衛生指導」「予防処置」等が electrical の「衛生」に誤マッチするため
    // 職名・文脈語でタイトル除外する）
    "歯科",
    "口腔",
    // IT・ソフトウェア開発（「設計」が survey に、社名等が誤分類されるのを防ぐ。
    // 全角表記もタイトル正規化後にマッチする。建設と衝突しない複合語のみ列挙する。
    // 除外した語と理由（いずれも建設求人を巻き込むため）:
    //   - 「システム設計」 … 空調/給排水「システム設計」
    //   - 「客先常駐」     … 建設の客先常駐求人（建築施工管理 等）
    //   - 「インフラエンジニア」「ネットワークエンジニア」
    //                      … 土木インフラ/通信設備（例:「インフラエンジニア（土木施工管理技士）」）
    //   - 製造オペレーター系 … 「建設機械オペレーター」を巻き込む
    // これらの純IT求人は建設キーワードを含まないため、ブロック語が無くても
    // カテゴリ未一致で自然に null になる（= 除外される）。
    "システムエンジニア",
    "システム開発",
    "プログラマ",
    "ソフトウェア",
    "webエンジニア",
    "web開発",
    "アプリ開発",
    "アプリケーション開発",
  ].join("|"),
  "i"
)

/**
 * 全角英数記号（Ａ-Ｚ, ａ-ｚ, ０-９, 全角記号）を半角へ正規化する。
 * ハローワークの求人タイトルは「ＳＥＳ」「Ｒｅａｃｔ」「ＣＡＤ」のように全角英字を
 * 多用するため、ブロックリスト / カテゴリ判定の前に正規化してマッチ精度を上げる。
 * 全角カタカナ（オペレーター等）や漢字は対象外（U+FF01–FF5E のみ変換）。
 */
function normalizeWidth(s: string): string {
  return s.replace(/[！-～]/g, (c) =>
    String.fromCharCode(c.charCodeAt(0) - 0xfee0)
  )
}

/**
 * ハローワークが求人に付与する職業分類名 (occupationCategoryName / sngbrui_n) による
 * 非建設職種の遮断。タイトル・説明文のキーワードと違い、HW 側が「この求人の職種」
 * として分類した属性なので、説明文に建設ワードが含まれていても誤って通過しない。
 * ※「運転」系分類はダンプ・重機回送等の建設ドライバーを含むためここでは遮断せず、
 *   inferCategory 内の建設文脈判定に委ねる。
 */
export const BLOCKED_CLASSIFICATION_PATTERN =
  /保険|金融|証券|銀行|飲食|調理|接客|給仕|介護|福祉|看護|医療|薬剤|歯科|保育|教育|教員|美容|理容|警備|清掃|理美容/

export function inferCategory(
  title: string,
  description: string | null | undefined,
  occupationCategoryName?: string | null
): CategoryValue | null {
  const titleLower = normalizeWidth(title).toLowerCase()

  // HW の職業分類名で非建設職種を先に遮断（説明文キーワードより信頼できる属性）
  if (
    occupationCategoryName &&
    BLOCKED_CLASSIFICATION_PATTERN.test(occupationCategoryName)
  ) {
    return null
  }

  // 非対象職種を先に除外（タイトルで判定）
  if (BLOCKED_OCCUPATION_PATTERN.test(titleLower)) return null

  const text = normalizeWidth(`${title} ${description ?? ""}`).toLowerCase()

  // 「板金」は建築板金（屋根・外壁・雨樋・ダクト = 対象）と自動車板金（対象外）の
  // 両方があり、タイトルだけでは判別できないケースがある（例: 「板金工」）。
  // タイトルに板金を含む場合は、本文の自動車系シグナルで対象外と判定する。
  if (/板金/.test(titleLower)) {
    const automotive = /自動車|車両|車体|カー|バンパー|ディーラー|車検|鈑金|純正部品|事故車/.test(text)
    const architectural = /建築板金|屋根|外壁|雨樋|雨とい|ダクト|折板|瓦棒|葺き/.test(text)
    if (automotive && !architectural) return null
  }

  // 営業職: タイトルが営業で、タイトル自体に建設系ワードが無いものは対象外。
  // （保険・人材・広告営業などは説明文に「建設業界のお客様」等が入りがちで、
  //   本文キーワード判定だと誤って通過するため、タイトルで判定する）
  if (/営業/.test(titleLower)) {
    const constructionSales =
      /建設|建築|土木|工事|住宅|リフォーム|外壁|屋根|重機|建機|資材/.test(titleLower)
    if (!constructionSales) return null
  }

  // ドライバー・運転手: 一般貨物（食品・雑貨・宅配等）は対象外。
  // 建設車両・建設現場の文脈がある場合のみ「ドライバー・重機」として取り込む。
  if (/ドライバー|運転手|トラック/.test(titleLower)) {
    const constructionDriver =
      /重機|建設機械|建機|クレーン|ダンプ|ショベル|ユンボ|ミキサー|生コン|ユニック|回送|セルフローダ|土砂|砕石|残土|アスファルト|高所作業車|杭|建設|建築|土木|現場|資材|鉄骨|足場|型枠|解体|産廃|工事/.test(
        text
      )
    return constructionDriver ? "driver" : null
  }

  const patterns: Array<{ category: CategoryValue; pattern: RegExp }> = [
    { category: "civil", pattern: /土木|舗装|道路|河川|橋梁|トンネル|造成/ },
    {
      // 「衛生」単独は歯科の「衛生指導」「口腔衛生」等に誤マッチするため、
      // 建設の給排水衛生設備を表す複合語に限定する。
      category: "electrical",
      pattern: /電気工事|設備工事|空調|衛生設備|給排水|配管|配線|消防/,
    },
    {
      category: "interior",
      pattern: /内装|仕上げ|塗装|防水|クロス|タイル|左官/,
    },
    { category: "demolition", pattern: /解体|産廃|アスベスト|スクラップ/ },
    {
      // 「オペレーター」単独は電話/PC/製造オペレーター等に誤マッチするため除外し、
      // 建設機械（重機/建設機械/クレーン/ダンプ/建機/ショベル/ユンボ）に限定する。
      category: "driver",
      pattern: /重機|建設機械|建機|クレーン|ダンプ|ショベル|ユンボ|ミキサー車|生コン|ユニック|セルフローダ|高所作業車/,
    },
    {
      category: "management",
      pattern: /施工管理|現場監督|現場代理人|工事主任|現場所長/,
    },
    { category: "survey", pattern: /測量|設計|cad|積算/ },
    {
      category: "construction",
      pattern: /建設|建築|躯体|鳶|鉄筋|型枠|大工|足場|基礎|屋根|建築板金/,
    },
  ]

  // 1) まずタイトルだけで判定する (タイトルは職種そのものなので広い語でも誤判定しにくい)
  for (const { category, pattern } of patterns) {
    if (pattern.test(titleLower)) return category
  }

  // 2) タイトルで決まらない場合のみ本文を見る。本文は一般的な言い回しが多く、
  //    広い語をそのまま当てると建設と無関係の求人が通ってしまう:
  //      「ライフスタイルに合わせて」→ タイル / 「基礎から丁寧に教えます」→ 基礎 /
  //      「人生設計」「自動車部品の設計」→ 設計 / 「道路沿いの工場」→ 道路
  //    そのため本文には、建設の文脈でしか使われない語・複合語だけを当てる。
  for (const { category, pattern } of DESCRIPTION_PATTERNS) {
    if (pattern.test(text)) return category
  }

  return null
}

/**
 * 本文 (説明文) 用のカテゴリ判定パターン。タイトル用と同じ並びだが、一般的な文章にも
 * 現れる語 (道路 / 仕上げ / クロス / タイル / 設計 / 基礎) だけを建設の複合語に限定している。
 * それ以外 (建設・建築・空調・配管・塗装 等) はタイトル用と同じ広さのまま。
 */
const DESCRIPTION_PATTERNS: Array<{ category: CategoryValue; pattern: RegExp }> = [
  {
    category: "civil",
    pattern: /土木|舗装|道路工事|道路整備|道路維持|道路補修|河川|橋梁|トンネル|造成/,
  },
  {
    category: "electrical",
    pattern: /電気工事|設備工事|空調|衛生設備|給排水|配管|配線|消防/,
  },
  {
    category: "interior",
    pattern: /内装|仕上げ工事|仕上工事|塗装|防水|クロス張|クロス貼|クロス職人|クロス工|(?<!ス)タイル|左官/,
  },
  { category: "demolition", pattern: /解体|産廃|アスベスト|スクラップ/ },
  {
    category: "driver",
    pattern: /重機|建設機械|建機|クレーン|ダンプ|ショベル|ユンボ|ミキサー車|生コン|ユニック|セルフローダ|高所作業車/,
  },
  {
    category: "management",
    pattern: /施工管理|現場監督|現場代理人|工事主任|現場所長/,
  },
  {
    category: "survey",
    pattern: /測量|cad|積算|建築設計|土木設計|設備設計|構造設計|意匠設計|設計事務所|施工図/,
  },
  {
    category: "construction",
    pattern: /建設|建築|躯体|鳶|鉄筋|型枠|大工|足場|基礎工|屋根|建築板金/,
  },
]

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
  // 既存行の公開日・閲覧数 (rankScore の鮮度計算用) をまとめて取得
  const existingByHwId = new Map<
    string,
    { publishedAt: Date | null; viewCount: number | null }
  >()
  // 重複排除済み / 運営が掲載終了にした既存求人。取り込みで active に戻さない。
  // 以前は一律 active に戻してからバッチの最後 (Step 1.5 / 1.6) で閉じ直していたため、
  // 取り込み中の数分間は公開状態になり、途中で処理が打ち切られると公開されたまま残った。
  const keepClosedHwIds = new Set<string>()
  if (!dryRun && jobs.length > 0) {
    try {
      const rows = await prisma.job.findMany({
        where: { helloworkId: { in: jobs.map((j) => j.helloworkId) } },
        select: {
          id: true,
          helloworkId: true,
          publishedAt: true,
          viewCount: true,
          dedupedTo: true,
        },
      })
      const adminClosed = new Set(
        rows.length > 0
          ? (
              await prisma.auditLog.findMany({
                where: {
                  resourceType: "job",
                  action: "admin_close",
                  resourceId: { in: rows.map((r) => r.id) },
                },
                select: { resourceId: true },
              })
            ).map((l) => l.resourceId)
          : []
      )
      for (const r of rows) {
        if (r.helloworkId && (r.dedupedTo || adminClosed.has(r.id))) {
          keepClosedHwIds.add(r.helloworkId)
        }
        if (r.helloworkId) {
          existingByHwId.set(r.helloworkId, {
            publishedAt: r.publishedAt,
            viewCount: r.viewCount,
          })
        }
      }
    } catch {
      // 取得できなくても取り込みは続ける (従来どおり「今」で計算)
    }
  }

  for (const job of jobs) {
    try {
      // 建設業 9 カテゴリのいずれにも該当しないジョブは取り込まない
      const category = inferCategory(
        job.title,
        job.description,
        job.occupationCategoryName
      )
      if (category === null) {
        skipped++
        // 以前は建設業と判定されて取り込み済みの求人が、判定の見直しや HW 側の
        // 内容変更で対象外になった場合は掲載を終了する。スキップするだけだと
        // 有効期限 (数週間〜数ヶ月) まで建設カテゴリのまま掲載され続けていた。
        if (!dryRun && existingByHwId.has(job.helloworkId)) {
          await prisma.job
            .updateMany({
              where: {
                helloworkId: job.helloworkId,
                source: "hellowork",
                status: "active",
              },
              data: { status: "closed" },
            })
            .catch((e) =>
              console.warn(
                `[import-batch] 対象外になった求人の掲載終了に失敗 (${job.helloworkId}):`,
                e instanceof Error ? e.message : e
              )
            )
        }
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
      const data = toJobRecord(
        job,
        category,
        companyId,
        existingByHwId.get(job.helloworkId)
      )

      // 有効期限を過ぎた求人は公開状態にしない。以前は一律 active に戻していたため、
      // expire-jobs cron が closed にした期限切れ求人が次の取り込み (毎時) で復活し、
      // 期限切れの validThrough を持ったまま掲載され続けていた。
      const importStatus =
        keepClosedHwIds.has(job.helloworkId) ||
        (data.expiresAt && data.expiresAt.getTime() <= Date.now())
          ? ("closed" as const)
          : ("active" as const)

      const result = await prisma.job.upsert({
        where: { helloworkId: job.helloworkId },
        create: { ...data, status: importStatus },
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
          displayPriority: data.displayPriority,
          prefecture: data.prefecture,
          city: data.city,
          address: data.address,
          tags: data.tags,
          rankScore: data.rankScore,
          status: importStatus,
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
  // Step 1.5: 重複排除済みの求人を再公開しない
  // 上の upsert は既存行を一律 status="active" に戻すため、job-dedupe が
  // closed + dedupedTo=<代表> にした重複求人が毎回の取り込みで復活し、
  // 一覧・フィードに重複掲載されていた (詳細ページは代表へ 301)。
  // -------------------------------------------------------
  if (!dryRun && processedIds.size > 0) {
    try {
      await prisma.job.updateMany({
        where: {
          source: "hellowork",
          status: "active",
          dedupedTo: { not: null },
          helloworkId: { in: Array.from(processedIds) },
        },
        data: { status: "closed" },
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      console.error(
        `[import-batch] 重複排除済み求人の再 close でエラー: ${message}`
      )
    }
  }

  // -------------------------------------------------------
  // Step 1.6: 管理者が手動で掲載終了にした求人を再公開しない
  // /admin/job-quality の「掲載終了」は status を closed にするだけなので、
  // 上の upsert が次の取り込み (毎時) で active に戻していた。掲載終了の操作は
  // 監査ログ (resourceType=job, action=admin_close) に残しており、それを印にする。
  // -------------------------------------------------------
  if (!dryRun && processedIds.size > 0) {
    try {
      const closedLogs = await prisma.auditLog.findMany({
        where: { resourceType: "job", action: "admin_close" },
        select: { resourceId: true },
        distinct: ["resourceId"],
        take: 5000,
      })
      const closedIds = closedLogs
        .map((l) => l.resourceId)
        .filter((v): v is string => !!v)
      if (closedIds.length > 0) {
        await prisma.job.updateMany({
          where: {
            id: { in: closedIds },
            source: "hellowork",
            status: "active",
          },
          data: { status: "closed" },
        })
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : String(error)
      console.error(
        `[import-batch] 管理者が掲載終了にした求人の再 close でエラー: ${message}`
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
