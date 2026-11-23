import { describe, it, expect } from "vitest"
import {
  scoreShindan,
  SHINDAN_QUESTIONS,
  type ShindanOption,
} from "@/lib/shindan"

describe("scoreShindan", () => {
  it("単一カテゴリに振り切った回答はそのカテゴリが1位", () => {
    const driverAnswers: ShindanOption[] = [
      { label: "", scores: { driver: 2 } },
      { label: "", scores: { driver: 3 } },
    ]
    expect(scoreShindan(driverAnswers)[0]).toBe("driver")
  })

  it("回答なしなら空配列", () => {
    expect(scoreShindan([])).toEqual([])
  })

  it("施工管理に寄せると management が上位", () => {
    const answers: ShindanOption[] = [
      { label: "", scores: { management: 3 } },
      { label: "", scores: { management: 2, survey: 1 } },
    ]
    const ranked = scoreShindan(answers)
    expect(ranked[0]).toBe("management")
    expect(ranked).toContain("survey")
  })

  it("全設問に選択肢が2つ以上ある", () => {
    for (const q of SHINDAN_QUESTIONS) {
      expect(q.options.length).toBeGreaterThanOrEqual(2)
    }
  })
})
