/**
 * 求人一覧の「おすすめ順」用ランキングスコア計算。
 *
 * スコアリングの方針（ユーザーの方針より）:
 * - SNS 登録の有無（5 種、1 個ごとに +5）
 * - 文字量（タグライン / pitch / ideal / employee voice / description の合計）
 * - 写真の数（最大 12、1 枚 +2）
 * - 3 ヶ月以内に更新されているか（lastContentUpdatedAt）
 *
 * 結果は integer。求人一覧は ORDER BY rankScore DESC, publishedAt DESC で並ぶ。
 *
 * @module ranking
 */

export interface CompanyForRank {
  tagline: string | null
  pitchHighlights: string | null
  idealCandidate: string | null
  employeeVoice: string | null
  photos: string[]
  instagramUrl: string | null
  tiktokUrl: string | null
  facebookUrl: string | null
  xUrl: string | null
  youtubeUrl: string | null
  lastContentUpdatedAt: Date | null
}

export interface JobForRank {
  description: string | null
  requirements: string | null
  // ========================================
  // 品質シグナル（オプション。未指定なら加点なし）
  // HelloWork 取込求人を含むすべての求人で「情報の充実度」を評価する。
  // 給与なし／極端に短い説明文／詳細欄空白 のような低品質求人を下位に押し下げる。
  // ========================================
  salaryMin?: number | null
  salaryMax?: number | null
  employmentType?: string | null
  workHours?: string | null
  holidays?: string | null
  insurance?: string | null
  bonus?: string | null
  commuteAllowance?: string | null
  companyFeatures?: string | null
  businessContent?: string | null
  // 時間軸シグナル (compute 時点での新着 / 期限切れ間近を反映)
  publishedAt?: Date | null
  expiresAt?: Date | null
  // 閲覧数シグナル (人気度。鮮度と組み合わせて compute)
  viewCount?: number | null
}

/**
 * 求人 × 企業情報からランキングスコアを計算する。
 * 各要素を独立に加点し合計。最大はざっくり 150 前後を想定。
 */
export function computeRankScore(
  job: JobForRank,
  company: CompanyForRank | null,
  now: Date = new Date()
): number {
  let score = 0

  if (company) {
    // SNS: 1 つに付き +5、最大 25
    const snsCount = [
      company.instagramUrl,
      company.tiktokUrl,
      company.facebookUrl,
      company.xUrl,
      company.youtubeUrl,
    ].filter(isNonEmpty).length
    score += snsCount * 5

    // 写真: 1 枚 +2、最大 24（12 枚）
    score += Math.min(12, company.photos?.length ?? 0) * 2

    // テキスト量: タグライン + pitch + ideal + employeeVoice の合計文字数を 50 で割って整数化、最大 +60
    const text =
      (company.tagline ?? "").length +
      (company.pitchHighlights ?? "").length +
      (company.idealCandidate ?? "").length +
      (company.employeeVoice ?? "").length
    score += Math.min(60, Math.floor(text / 50))

    // 3 ヶ月以内更新: +20、6 ヶ月以内: +10
    if (company.lastContentUpdatedAt) {
      const days =
        (now.getTime() - company.lastContentUpdatedAt.getTime()) /
        (1000 * 60 * 60 * 24)
      if (days <= 90) score += 20
      else if (days <= 180) score += 10
    }
  }

  // 求人本文の文字量: description / requirements の合計 / 100 を最大 15 で加点
  const jobText =
    (job.description ?? "").length + (job.requirements ?? "").length
  score += Math.min(15, Math.floor(jobText / 100))

  // ========================================
  // 品質シグナル: 求人レコード自体の充実度
  // 値が未指定（undefined）のフィールドは加点対象外なので、
  // 既存の呼び出し（JobForRank = {description, requirements} のみ）は影響を受けない。
  // ========================================

  // 給与情報: 上限・下限が両方あれば +20、片方だけなら +10
  const hasMin = typeof job.salaryMin === "number" && job.salaryMin > 0
  const hasMax = typeof job.salaryMax === "number" && job.salaryMax > 0
  if (hasMin && hasMax) score += 20
  else if (hasMin || hasMax) score += 10

  // 雇用形態: 正社員は最も求められる品質シグナル
  if (job.employmentType === "full_time") score += 5

  // 詳細項目の充実度（各 +3）
  if (isNonEmpty(job.workHours)) score += 3
  if (isNonEmpty(job.holidays)) score += 3
  if (isNonEmpty(job.insurance)) score += 3
  if (isNonEmpty(job.bonus)) score += 3
  if (isNonEmpty(job.commuteAllowance)) score += 3

  // 企業情報（各 +5）
  if (isNonEmpty(job.companyFeatures)) score += 5
  if (isNonEmpty(job.businessContent)) score += 5

  // 説明文が極端に短い場合のペナルティ（30 文字未満かつ空でない）
  const descLen = (job.description ?? "").length
  if (descLen > 0 && descLen < 30) score -= 10

  // 新着加点: publishedAt が 3 日以内なら +15、7 日以内なら +8
  if (job.publishedAt) {
    const ageDays =
      (now.getTime() - job.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (ageDays >= 0 && ageDays <= 3) score += 15
    else if (ageDays >= 0 && ageDays <= 7) score += 8
  }

  // 期限切れ間近ペナルティ: expiresAt が 7 日以内なら -10、3 日以内なら -20
  if (job.expiresAt) {
    const daysUntilExpire =
      (job.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    if (daysUntilExpire >= 0 && daysUntilExpire <= 3) score -= 20
    else if (daysUntilExpire >= 0 && daysUntilExpire <= 7) score -= 10
  }

  // 人気度: viewCount を鮮度補正付きで加点。
  // 50 閲覧 = +1、1000 閲覧 = +20 で頭打ち。
  // 古い求人ほど閲覧数が稼げる構造なので、publishedAt が 30 日超なら半減。
  if (typeof job.viewCount === "number" && job.viewCount > 0) {
    let popularity = Math.min(20, Math.floor(job.viewCount / 50))
    if (job.publishedAt) {
      const ageDays =
        (now.getTime() - job.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      if (ageDays > 30) popularity = Math.floor(popularity / 2)
    }
    score += popularity
  }

  return score
}

function isNonEmpty(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0
}

// ============================================================
// UI 用: スコア内訳（プロフィール編集ページのリアルタイム表示）
// ============================================================

export interface ScoreBreakdownItem {
  /** 一意 id（key 用） */
  id: "sns" | "photos" | "text" | "freshness"
  /** ラベル */
  label: string
  /** 現時点の獲得点 */
  current: number
  /** 取り得る最大点 */
  max: number
  /** 完了済みか（current >= max なら true） */
  done: boolean
  /** 改善のためのヒント（残り何で +N 点） */
  hint: string
}

export interface ScoreBreakdown {
  items: ScoreBreakdownItem[]
  /** 現時点の合計点（求人本文を除く company 寄与のみ） */
  totalScore: number
  /** 取り得る最大点 */
  maxScore: number
  /** 0-1 の進捗率 */
  ratio: number
}

const TEXT_FIELDS = ["tagline", "pitchHighlights", "idealCandidate", "employeeVoice"] as const
const RECOMMENDED_TEXT_TOTAL = 3000 // 4 項目合計 3000 文字あれば概ね充実

/**
 * 企業プロフィール編集 UI のスコア表示用。
 * computeRankScore と同じロジックを項目別に分解する。
 */
export function computeScoreBreakdown(
  company: CompanyForRank,
  now: Date = new Date()
): ScoreBreakdown {
  // SNS
  const snsList = [
    company.instagramUrl,
    company.tiktokUrl,
    company.facebookUrl,
    company.xUrl,
    company.youtubeUrl,
  ]
  const snsCount = snsList.filter(isNonEmpty).length
  const snsScore = snsCount * 5
  const snsMax = 5 * 5

  // 写真
  const photoCount = company.photos?.length ?? 0
  const photoScoreCount = Math.min(12, photoCount)
  const photoScore = photoScoreCount * 2
  const photoMax = 12 * 2

  // テキスト量
  const totalChars = TEXT_FIELDS.reduce((sum, f) => sum + (company[f] ?? "").length, 0)
  const textScore = Math.min(60, Math.floor(totalChars / 50))
  const textMax = 60

  // 更新日
  let freshScore = 0
  let freshHint = "プロフィールを保存すると最新性 +20 点"
  if (company.lastContentUpdatedAt) {
    const days =
      (now.getTime() - company.lastContentUpdatedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (days <= 90) {
      freshScore = 20
      freshHint = "3 ヶ月以内に更新済み（+20）"
    } else if (days <= 180) {
      freshScore = 10
      freshHint = `${Math.floor(days)} 日経過、再保存で +10`
    } else {
      freshScore = 0
      freshHint = `${Math.floor(days)} 日経過、再保存で +20`
    }
  }
  const freshMax = 20

  const items: ScoreBreakdownItem[] = [
    {
      id: "sns",
      label: `SNS 登録（${snsCount} / 5 個）`,
      current: snsScore,
      max: snsMax,
      done: snsCount >= 5,
      hint:
        snsCount >= 5
          ? "全 SNS 登録済み"
          : `あと ${5 - snsCount} 個で +${(5 - snsCount) * 5} 点`,
    },
    {
      id: "photos",
      label: `写真（${photoCount} / 12 枚）`,
      current: photoScore,
      max: photoMax,
      done: photoCount >= 12,
      hint:
        photoCount >= 12
          ? "上限まで掲載済み"
          : `あと ${12 - photoCount} 枚で +${(12 - photoCount) * 2} 点`,
    },
    {
      id: "text",
      label: `本文の充実度（${totalChars.toLocaleString()} / ${RECOMMENDED_TEXT_TOTAL.toLocaleString()} 文字）`,
      current: textScore,
      max: textMax,
      done: textScore >= textMax,
      hint:
        textScore >= textMax
          ? "充実"
          : `あと ${(textMax - textScore) * 50} 文字で +${textMax - textScore} 点`,
    },
    {
      id: "freshness",
      label: "最終更新",
      current: freshScore,
      max: freshMax,
      done: freshScore >= freshMax,
      hint: freshHint,
    },
  ]

  const totalScore = items.reduce((sum, it) => sum + it.current, 0)
  const maxScore = items.reduce((sum, it) => sum + it.max, 0)
  return {
    items,
    totalScore,
    maxScore,
    ratio: maxScore > 0 ? totalScore / maxScore : 0,
  }
}
