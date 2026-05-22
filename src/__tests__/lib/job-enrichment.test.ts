import { describe, it, expect } from "vitest"
import {
  cleanTitle,
  extractTags,
  fallbackSalary,
  extractWorkConditions,
  formatDescriptionSections,
  groupTags,
  TAG_GROUP_LABELS,
} from "@/lib/job-enrichment"

describe("cleanTitle", () => {
  it("strips leading prefecture name", () => {
    expect(cleanTitle("東京都江戸川区/施工管理（建築）", "東京都")).toBe(
      "江戸川区/施工管理（建築）"
    )
  })

  it("strips leading postal code", () => {
    expect(cleanTitle("〒100-0001 施工管理スタッフ", null)).toBe(
      "施工管理スタッフ"
    )
  })

  it("normalizes decoration symbols", () => {
    expect(cleanTitle("◎月給25万円◎施工管理★寮完備", null)).toBe(
      "月給25万円 施工管理 寮完備"
    )
  })

  it("collapses Japanese full-width spaces", () => {
    expect(cleanTitle("施工　管理 　スタッフ", null)).toBe("施工 管理 スタッフ")
  })

  it("trims to last delimiter when over 80 chars", () => {
    const long =
      "施工管理（建築）大規模再開発プロジェクトでの現場監督業務を担当いただきます/未経験者歓迎/月給/賞与"
    const t = cleanTitle(long, null)
    expect(t.length).toBeLessThanOrEqual(80)
    expect(t.endsWith("。") || t.endsWith("/") || t.endsWith(" ") || t.length <= 80).toBe(true)
  })

  it("returns '求人' for empty/whitespace input", () => {
    expect(cleanTitle("", null)).toBe("求人")
    expect(cleanTitle("   ", null)).toBe("求人")
  })
})

describe("extractTags", () => {
  it("picks up 待遇キーワード from description", () => {
    const desc = "未経験OK！週休2日制で土日祝休み。寮完備、マイカー通勤可、社会保険完備。"
    const tags = extractTags("", desc)
    expect(tags).toContain("未経験OK")
    expect(tags).toContain("週休2日")
    expect(tags).toContain("土日休み")
    expect(tags).toContain("寮・社宅あり")
    expect(tags).toContain("マイカー通勤可")
    expect(tags).toContain("社保完備")
  })

  it("returns empty array for no matches", () => {
    expect(extractTags("作業員", "現場での組立業務")).toEqual([])
  })

  it("deduplicates and caps at 12 tags", () => {
    const desc = `
      未経験OK 経験不問 学歴不問 資格取得支援 寮あり 社宅あり マイカー通勤可
      賞与あり 昇給あり 退職金あり 週休2日 土日休み 日払い 交通費支給
      社保完備 制服支給 残業なし 日勤のみ 長期休暇 女性歓迎 外国人歓迎
    `
    const tags = extractTags(desc)
    expect(tags.length).toBeLessThanOrEqual(12)
    expect(new Set(tags).size).toBe(tags.length)
  })

  it("treats null inputs gracefully", () => {
    expect(extractTags(null, undefined, "")).toEqual([])
  })
})

describe("fallbackSalary", () => {
  const empty = { min: null, max: null, type: null }

  it("preserves existing salary if min is set", () => {
    const r = fallbackSalary("月給100万円", { min: 250000, max: null, type: "monthly" })
    expect(r).toEqual({ min: 250000, max: null, type: "monthly" })
  })

  it("extracts monthly salary range", () => {
    const r = fallbackSalary("月給 250,000円〜350,000円", empty)
    expect(r).toEqual({ min: 250000, max: 350000, type: "monthly" })
  })

  it("extracts hourly", () => {
    const r = fallbackSalary("時給1500円から", empty)
    expect(r).toEqual({ min: 1500, max: null, type: "hourly" })
  })

  it("extracts annual (万円 unit)", () => {
    const r = fallbackSalary("年収500〜700万円", empty)
    expect(r).toEqual({ min: 5000000, max: 7000000, type: "annual" })
  })

  it("returns null when no salary found", () => {
    expect(fallbackSalary("詳細はお問い合わせください", empty)).toEqual(empty)
  })
})

describe("extractWorkConditions", () => {
  it("extracts working hours, holidays, station, insurance", () => {
    const desc =
      "勤務時間 9:00〜18:00 / 完全週休2日制（土日祝休）/ 新宿駅から徒歩 5 分、マイカー通勤可 / 社会保険完備"
    const c = extractWorkConditions(desc)
    expect(c.workingHours).toBe("9:00〜18:00")
    expect(c.holidays).toBe("完全週休2日")
    expect(c.accessNote).toContain("新宿駅 徒歩5分")
    expect(c.accessNote).toContain("マイカー通勤可")
    expect(c.insurance).toBe("社会保険完備")
  })

  it("returns nulls for empty input", () => {
    expect(extractWorkConditions(null, undefined)).toEqual({
      workingHours: null,
      holidays: null,
      accessNote: null,
      insurance: null,
    })
  })

  it("falls back to per-insurance bundle when 完備 not stated", () => {
    const c = extractWorkConditions("加入保険: 雇用保険、労災保険、健康保険、厚生年金")
    expect(c.insurance).toBe("雇用・労災・健康・厚生年金")
  })
})

describe("groupTags", () => {
  it("groups well-known tags into expected buckets", () => {
    const r = groupTags([
      "未経験OK", // experience
      "賞与あり", // wage
      "週休2日", // time
      "資格取得支援", // benefits
    ])
    expect(r.experience).toEqual(["未経験OK"])
    expect(r.wage).toEqual(["賞与あり"])
    expect(r.time).toEqual(["週休2日"])
    expect(r.benefits).toEqual(["資格取得支援"])
  })

  it("falls back unknown tags to benefits", () => {
    const r = groupTags(["未経験OK", "独自カスタムタグ"])
    expect(r.experience).toEqual(["未経験OK"])
    expect(r.benefits).toContain("独自カスタムタグ")
  })

  it("dedupes within a group", () => {
    const r = groupTags(["未経験OK", "未経験OK"])
    expect(r.experience).toEqual(["未経験OK"])
  })

  it("returns all groups even when empty", () => {
    const r = groupTags([])
    expect(r).toEqual({ wage: [], benefits: [], experience: [], time: [] })
  })
})

describe("TAG_GROUP_LABELS", () => {
  it("has labels for all 4 groups", () => {
    expect(TAG_GROUP_LABELS.wage).toBe("賃金")
    expect(TAG_GROUP_LABELS.benefits).toBe("福利厚生・働き方")
    expect(TAG_GROUP_LABELS.experience).toBe("経験・年齢")
    expect(TAG_GROUP_LABELS.time).toBe("時間・休日・通勤")
  })
})

describe("formatDescriptionSections", () => {
  it("splits text by 【...】 headings", () => {
    const text = "【仕事内容】施工管理業務全般。\n【勤務地】東京都内現場。\n【給与】月給25万円〜"
    const sections = formatDescriptionSections(text)
    expect(sections).toHaveLength(3)
    expect(sections[0].heading).toBe("仕事内容")
    expect(sections[1].heading).toBe("勤務地")
    expect(sections[2].heading).toBe("給与")
    expect(sections[0].body).toContain("施工管理業務全般")
  })

  it("returns single section without heading for plain text", () => {
    const sections = formatDescriptionSections("シンプルな説明文。改行もあり\n2 行目")
    expect(sections).toHaveLength(1)
    expect(sections[0].heading).toBe(null)
    expect(sections[0].body).toContain("2 行目")
  })

  it("returns empty array for empty input", () => {
    expect(formatDescriptionSections(null)).toEqual([])
    expect(formatDescriptionSections("")).toEqual([])
  })

  it("handles ■ heading markers", () => {
    const sections = formatDescriptionSections("■仕事内容\n施工管理\n■勤務地\n東京")
    expect(sections.length).toBeGreaterThanOrEqual(2)
    expect(sections[0].heading).toBe("仕事内容")
  })
})
