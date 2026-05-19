import { describe, it, expect } from "vitest"
import {
  computeRankScore,
  computeScoreBreakdown,
  type CompanyForRank,
  type JobForRank,
} from "@/lib/ranking"

const emptyCompany: CompanyForRank = {
  tagline: null,
  pitchHighlights: null,
  idealCandidate: null,
  employeeVoice: null,
  photos: [],
  instagramUrl: null,
  tiktokUrl: null,
  facebookUrl: null,
  xUrl: null,
  youtubeUrl: null,
  lastContentUpdatedAt: null,
}

const emptyJob: JobForRank = { description: null, requirements: null }

describe("computeRankScore", () => {
  it("returns 0 when company and job have no data", () => {
    expect(computeRankScore(emptyJob, emptyCompany)).toBe(0)
  })

  it("returns 0 when company is null and job is empty", () => {
    expect(computeRankScore(emptyJob, null)).toBe(0)
  })

  it("adds 5 points per SNS link (max 25)", () => {
    const s1 = computeRankScore(emptyJob, {
      ...emptyCompany,
      instagramUrl: "https://example.com",
    })
    expect(s1).toBe(5)

    const s5 = computeRankScore(emptyJob, {
      ...emptyCompany,
      instagramUrl: "https://x",
      tiktokUrl: "https://x",
      facebookUrl: "https://x",
      xUrl: "https://x",
      youtubeUrl: "https://x",
    })
    expect(s5).toBe(25)
  })

  it("adds 2 points per photo, capped at 12 photos", () => {
    expect(
      computeRankScore(emptyJob, {
        ...emptyCompany,
        photos: Array.from({ length: 5 }, (_, i) => `url-${i}`),
      })
    ).toBe(10)

    expect(
      computeRankScore(emptyJob, {
        ...emptyCompany,
        photos: Array.from({ length: 50 }, (_, i) => `url-${i}`),
      })
    ).toBe(24) // 12 * 2 = 24 (cap)
  })

  it("adds points for text length (capped at 60)", () => {
    expect(
      computeRankScore(emptyJob, {
        ...emptyCompany,
        tagline: "x".repeat(50),
      })
    ).toBe(1) // 50/50 = 1

    expect(
      computeRankScore(emptyJob, {
        ...emptyCompany,
        tagline: "x".repeat(100),
        pitchHighlights: "y".repeat(200),
      })
    ).toBe(6) // 300/50 = 6
  })

  it("adds 20 points for content updated within 90 days", () => {
    const now = new Date("2026-05-11")
    const recent = new Date("2026-04-11") // 30 days ago
    expect(
      computeRankScore(
        emptyJob,
        { ...emptyCompany, lastContentUpdatedAt: recent },
        now
      )
    ).toBe(20)
  })

  it("adds 10 points for content updated 90-180 days ago", () => {
    const now = new Date("2026-05-11")
    const older = new Date("2026-01-11") // ~120 days ago
    expect(
      computeRankScore(
        emptyJob,
        { ...emptyCompany, lastContentUpdatedAt: older },
        now
      )
    ).toBe(10)
  })

  it("adds 0 points for content updated 180+ days ago", () => {
    const now = new Date("2026-05-11")
    const veryOld = new Date("2025-05-11") // 365 days ago
    expect(
      computeRankScore(
        emptyJob,
        { ...emptyCompany, lastContentUpdatedAt: veryOld },
        now
      )
    ).toBe(0)
  })

  it("adds job description text points (capped at 15)", () => {
    expect(computeRankScore({ description: "x".repeat(100), requirements: null }, null)).toBe(1)
    expect(computeRankScore({ description: "x".repeat(2000), requirements: null }, null)).toBe(15)
  })

  it("computes composite score from all factors", () => {
    const now = new Date("2026-05-11")
    const recent = new Date("2026-04-11")
    const score = computeRankScore(
      { description: "x".repeat(500), requirements: null },
      {
        ...emptyCompany,
        instagramUrl: "https://x",
        tiktokUrl: "https://x",
        photos: ["a", "b", "c"],
        tagline: "y".repeat(100),
        lastContentUpdatedAt: recent,
      },
      now
    )
    // SNS: 2 * 5 = 10
    // Photos: 3 * 2 = 6
    // Text: 100 / 50 = 2
    // Fresh: 20
    // Description: 500 / 100 = 5
    expect(score).toBe(43)
  })

  it("ignores whitespace-only SNS URLs", () => {
    expect(
      computeRankScore(emptyJob, {
        ...emptyCompany,
        instagramUrl: "   ",
        tiktokUrl: "",
      })
    ).toBe(0)
  })

  // ========================================
  // 品質シグナル (低品質求人を下位に押し下げる)
  // ========================================
  describe("quality signals", () => {
    it("adds 20 points when both salary min and max are present", () => {
      const score = computeRankScore(
        { ...emptyJob, salaryMin: 200000, salaryMax: 300000 },
        null
      )
      expect(score).toBe(20)
    })

    it("adds 10 points when only one of salary min/max is present", () => {
      expect(
        computeRankScore({ ...emptyJob, salaryMin: 200000, salaryMax: null }, null)
      ).toBe(10)
      expect(
        computeRankScore({ ...emptyJob, salaryMin: null, salaryMax: 300000 }, null)
      ).toBe(10)
    })

    it("adds 0 points when salary min/max are 0 or undefined", () => {
      expect(
        computeRankScore({ ...emptyJob, salaryMin: 0, salaryMax: 0 }, null)
      ).toBe(0)
      expect(computeRankScore({ ...emptyJob }, null)).toBe(0)
    })

    it("adds 5 points for employmentType=full_time", () => {
      expect(
        computeRankScore({ ...emptyJob, employmentType: "full_time" }, null)
      ).toBe(5)
      expect(
        computeRankScore({ ...emptyJob, employmentType: "part_time" }, null)
      ).toBe(0)
    })

    it("adds 3 points each for detail fields", () => {
      const score = computeRankScore(
        {
          ...emptyJob,
          workHours: "8:00-17:00",
          holidays: "土日祝",
          insurance: "雇用・労災・健康・厚生",
          bonus: "年 2 回",
          commuteAllowance: "全額支給",
        },
        null
      )
      expect(score).toBe(15) // 3 * 5
    })

    it("adds 5 points each for companyFeatures and businessContent", () => {
      const score = computeRankScore(
        {
          ...emptyJob,
          companyFeatures: "若手活躍中",
          businessContent: "総合建設業",
        },
        null
      )
      expect(score).toBe(10) // 5 * 2
    })

    it("applies penalty for description shorter than 30 chars", () => {
      // 説明文 20 文字 → ペナルティ -10、description 文字量加点は 20/100 = 0
      const score = computeRankScore(
        { description: "短い説明", requirements: null },
        null
      )
      expect(score).toBe(-10)
    })

    it("does not penalize when description is empty (handled by absence)", () => {
      const score = computeRankScore({ description: "", requirements: null }, null)
      expect(score).toBe(0)
    })

    it("composite: fully filled HelloWork-like job scores high", () => {
      const score = computeRankScore(
        {
          description: "x".repeat(500),
          requirements: "y".repeat(200),
          salaryMin: 200000,
          salaryMax: 350000,
          employmentType: "full_time",
          workHours: "8:00-17:00",
          holidays: "土日祝",
          insurance: "完備",
          bonus: "年 2 回",
          commuteAllowance: "全額支給",
          companyFeatures: "若手活躍中",
          businessContent: "総合建設業",
        },
        null
      )
      // description+requirements 700 chars / 100 = 7
      // salary both: 20
      // employmentType full_time: 5
      // 5 detail fields × 3 = 15
      // 2 company fields × 5 = 10
      // total = 7 + 20 + 5 + 15 + 10 = 57
      expect(score).toBe(57)
    })

    it("composite: minimal HelloWork job scores near zero", () => {
      // 給与なし、雇用形態なし、詳細欄なし、説明 100 文字
      const score = computeRankScore(
        { description: "x".repeat(100), requirements: null },
        null
      )
      expect(score).toBe(1) // 100/100 = 1
    })
  })
})

describe("computeScoreBreakdown", () => {
  it("空企業は全項目 0/max で done=false", () => {
    const r = computeScoreBreakdown(emptyCompany)
    expect(r.totalScore).toBe(0)
    expect(r.maxScore).toBe(25 + 24 + 60 + 20)
    expect(r.ratio).toBe(0)
    expect(r.items).toHaveLength(4)
    for (const item of r.items) {
      expect(item.current).toBe(0)
      expect(item.done).toBe(false)
    }
  })

  it("SNS 3 個登録で SNS 項目が 15 点", () => {
    const r = computeScoreBreakdown({
      ...emptyCompany,
      instagramUrl: "https://example.com",
      tiktokUrl: "https://example.com",
      xUrl: "https://example.com",
    })
    const sns = r.items.find((i) => i.id === "sns")!
    expect(sns.current).toBe(15)
    expect(sns.done).toBe(false)
    expect(sns.hint).toMatch(/あと 2 個/)
  })

  it("SNS 5 個 全部登録で done=true", () => {
    const r = computeScoreBreakdown({
      ...emptyCompany,
      instagramUrl: "x",
      tiktokUrl: "x",
      facebookUrl: "x",
      xUrl: "x",
      youtubeUrl: "x",
    })
    const sns = r.items.find((i) => i.id === "sns")!
    expect(sns.current).toBe(25)
    expect(sns.done).toBe(true)
  })

  it("写真 5 枚で 10 点、12 枚で done", () => {
    const r5 = computeScoreBreakdown({
      ...emptyCompany,
      photos: ["a", "b", "c", "d", "e"],
    })
    expect(r5.items.find((i) => i.id === "photos")!.current).toBe(10)
    expect(r5.items.find((i) => i.id === "photos")!.done).toBe(false)

    const r12 = computeScoreBreakdown({
      ...emptyCompany,
      photos: Array(12).fill("x"),
    })
    expect(r12.items.find((i) => i.id === "photos")!.done).toBe(true)
  })

  it("テキスト 3000 文字で text 項目満点", () => {
    const r = computeScoreBreakdown({
      ...emptyCompany,
      tagline: "a".repeat(200),
      pitchHighlights: "a".repeat(1000),
      idealCandidate: "a".repeat(800),
      employeeVoice: "a".repeat(1000),
    })
    const text = r.items.find((i) => i.id === "text")!
    expect(text.current).toBe(60)
    expect(text.done).toBe(true)
  })

  it("90 日以内更新で freshness 20 点", () => {
    const r = computeScoreBreakdown({
      ...emptyCompany,
      lastContentUpdatedAt: new Date(),
    })
    const fresh = r.items.find((i) => i.id === "freshness")!
    expect(fresh.current).toBe(20)
    expect(fresh.done).toBe(true)
  })

  it("180 日以内更新で freshness 10 点", () => {
    const now = new Date("2026-05-12")
    const lastUpdate = new Date("2026-01-12") // 約 120 日前
    const r = computeScoreBreakdown(
      { ...emptyCompany, lastContentUpdatedAt: lastUpdate },
      now
    )
    expect(r.items.find((i) => i.id === "freshness")!.current).toBe(10)
  })

  it("ratio が現在/max と一致する", () => {
    const r = computeScoreBreakdown({
      ...emptyCompany,
      instagramUrl: "x",
      tiktokUrl: "x",
    })
    expect(r.ratio).toBeCloseTo(r.totalScore / r.maxScore, 5)
  })
})
