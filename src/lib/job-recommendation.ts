/**
 * 求人データから「この求人のおすすめポイント」を 100 字前後の体言止め文で
 * 自動生成する。値が無い場合は空配列を返し、UI 側で非表示にする。
 *
 * 評価軸:
 *  - 給与水準（月給換算 25 万円以上 / 28 万円以上 / 30 万円以上）
 *  - 年間休日（110 日以上 / 120 日以上）
 *  - 社会保険完備
 *  - 未経験 OK / 学歴不問
 *  - 資格取得支援
 *  - 賞与あり / 各種手当
 *  - 立地（駅近、本文に「駅」「徒歩」）
 *  - 試用期間明記
 *  - 受動喫煙対策（屋内禁煙）
 *
 * 抽出した強みから最大 3 つを「・」区切りで連結し、体言止め 1 文で締める。
 * トーンは「親しみやすく前向き」。事実ベースで盛り過ぎない。
 */

import { getCategoryLabel } from "@/lib/categories"

type RecommendationInput = {
  title: string
  category: string
  prefecture: string
  city: string | null
  address: string | null
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  description: string | null
  requirements: string | null
  bonus: string | null
  commuteAllowance: string | null
  fixedOvertime: string | null
  workHours: string | null
  holidays: string | null
  annualHolidays: number | null
  insurance: string | null
  smokingPolicy: string | null
  trialPeriod: string | null
  requiredExperience: string | null
  education: string | null
}

type Point = {
  /** バッジ表示用の短いラベル（例: 「年間休日120日」） */
  label: string
  /** 1 文中で使う言い回し（例: 「年間休日120日でしっかり休める環境」） */
  phrase: string
}

export type Recommendation = {
  /** 100 字前後の総評（体言止め） */
  summary: string
  /** ポイント一覧（バッジ表示用） */
  points: Point[]
}

/**
 * 求人データから推薦文を生成する。
 * 強みが 1 つも見つからない場合は null を返す（UI で非表示）。
 */
export function generateRecommendation(
  job: RecommendationInput
): Recommendation | null {
  const points: Point[] = []
  const text = `${job.description ?? ""}\n${job.requirements ?? ""}`

  // 給与水準
  const monthly = toMonthlyYen(job.salaryMin, job.salaryType)
  if (monthly != null) {
    if (monthly >= 300_000) {
      points.push({
        label: "月給30万円〜",
        phrase: "月給30万円スタートの好待遇",
      })
    } else if (monthly >= 280_000) {
      points.push({
        label: "月給28万円〜",
        phrase: "月給28万円スタートでしっかり稼げる環境",
      })
    } else if (monthly >= 250_000) {
      points.push({
        label: "月給25万円〜",
        phrase: "月給25万円以上の安定収入",
      })
    }
  }

  // 年間休日
  if (job.annualHolidays != null) {
    if (job.annualHolidays >= 120) {
      points.push({
        label: `年間休日${job.annualHolidays}日`,
        phrase: `年間休日${job.annualHolidays}日でプライベートも充実`,
      })
    } else if (job.annualHolidays >= 110) {
      points.push({
        label: `年間休日${job.annualHolidays}日`,
        phrase: `年間休日${job.annualHolidays}日でしっかり休める環境`,
      })
    }
  }

  // 社会保険
  if (job.insurance && /雇用|労災|健康|厚生|社会保険/.test(job.insurance)) {
    points.push({
      label: "社会保険完備",
      phrase: "各種社会保険完備で安心",
    })
  }

  // 未経験 OK
  if (
    /未経験|経験不問|経験なし|初心者|学歴不問/.test(text) ||
    (job.requiredExperience && /不問|未経験|なし/.test(job.requiredExperience))
  ) {
    points.push({
      label: "未経験OK",
      phrase: "未経験から始められるサポート体制",
    })
  } else if (
    job.education &&
    /不問|問わない|なし/.test(job.education)
  ) {
    points.push({
      label: "学歴不問",
      phrase: "学歴不問で挑戦しやすい",
    })
  }

  // 資格取得支援
  if (/資格取得|取得支援|資格手当|免許取得/.test(text)) {
    points.push({
      label: "資格取得支援",
      phrase: "資格取得支援でスキルアップ可能",
    })
  }

  // 賞与
  if (job.bonus && job.bonus.trim() && !/無|なし/.test(job.bonus)) {
    points.push({
      label: "賞与あり",
      phrase: "賞与ありで頑張りが評価される",
    })
  }

  // 通勤手当
  if (
    job.commuteAllowance &&
    job.commuteAllowance.trim() &&
    !/無|なし/.test(job.commuteAllowance)
  ) {
    points.push({
      label: "通勤手当支給",
      phrase: "通勤手当支給で通勤費もカバー",
    })
  }

  // 駅近・アクセス
  if (
    job.address &&
    /駅|徒歩\s*\d+|分以内/.test(`${job.address}\n${text}`)
  ) {
    points.push({
      label: "駅から好アクセス",
      phrase: "駅から好アクセスで通勤ラクラク",
    })
  }

  // 屋内禁煙
  if (
    job.smokingPolicy &&
    /禁煙|分煙|対策あり/.test(job.smokingPolicy)
  ) {
    points.push({
      label: "受動喫煙対策あり",
      phrase: "受動喫煙対策ありで快適な職場環境",
    })
  }

  // 残業少（固定残業ありかつ少時間 or 「残業少」キーワード）
  if (/残業.{0,3}(少|な|なし)|残業ほとんど/.test(text)) {
    points.push({
      label: "残業少なめ",
      phrase: "残業少なめで家庭との両立も叶う",
    })
  }

  // ポイントが 1 つも無い場合は最低限の文面のみ返す
  if (points.length === 0) {
    const area = [job.prefecture, job.city].filter(Boolean).join("")
    const categoryLabel = getCategoryLabel(job.category)
    return {
      summary: `${area}で募集中の${categoryLabel}のお仕事。気になる方はまずは詳細をチェック！`,
      points: [],
    }
  }

  // 上位 3 ポイントを連結して 1 文に
  const chosen = points.slice(0, 3)
  const area = [job.prefecture, job.city].filter(Boolean).join("")
  const categoryLabel = getCategoryLabel(job.category)

  const phrasesText = chosen.map((p) => p.phrase).join("、")
  const summary = `${area}の${categoryLabel}求人。${phrasesText}。気になる方はまずは詳細チェック！`

  return { summary, points }
}

/**
 * salaryMin と salaryType から月額換算の最低額を返す。
 * - monthly: そのまま
 * - hourly: 8h × 20日 = 160h で換算
 * - annual: ÷ 12
 */
function toMonthlyYen(
  salaryMin: number | null,
  salaryType: string | null
): number | null {
  if (salaryMin == null) return null
  switch (salaryType) {
    case "hourly":
      return salaryMin * 160
    case "annual":
      return Math.floor(salaryMin / 12)
    case "monthly":
    default:
      return salaryMin
  }
}
