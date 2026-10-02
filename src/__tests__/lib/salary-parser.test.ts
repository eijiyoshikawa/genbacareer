import { describe, it, expect } from "vitest"
import {
  parseSalaryText,
  inferSalaryTypeFromAmount,
} from "@/lib/crawler/salary-parser"

describe("inferSalaryTypeFromAmount", () => {
  it("時給帯", () => {
    expect(inferSalaryTypeFromAmount(900)).toBe("hourly")
    expect(inferSalaryTypeFromAmount(1_500)).toBe("hourly")
    expect(inferSalaryTypeFromAmount(4_999)).toBe("hourly")
  })

  it("日給帯", () => {
    expect(inferSalaryTypeFromAmount(5_000)).toBe("daily")
    expect(inferSalaryTypeFromAmount(12_000)).toBe("daily")
    expect(inferSalaryTypeFromAmount(25_000)).toBe("daily")
  })

  it("月給帯", () => {
    expect(inferSalaryTypeFromAmount(30_000)).toBe("monthly")
    expect(inferSalaryTypeFromAmount(250_000)).toBe("monthly")
    expect(inferSalaryTypeFromAmount(1_000_000)).toBe("monthly")
  })

  it("年俸帯", () => {
    expect(inferSalaryTypeFromAmount(1_500_000)).toBe("annual")
    expect(inferSalaryTypeFromAmount(5_000_000)).toBe("annual")
  })

  it("null / 0 / 負数", () => {
    expect(inferSalaryTypeFromAmount(null)).toBe(null)
    expect(inferSalaryTypeFromAmount(0)).toBe(null)
    expect(inferSalaryTypeFromAmount(-1000)).toBe(null)
  })
})


describe("parseSalaryText", () => {
  describe("月給", () => {
    it("月給 + カンマ区切り + 範囲", () => {
      expect(parseSalaryText("月給 250,000円〜300,000円")).toEqual({
        type: "monthly",
        min: 250_000,
        max: 300_000,
      })
    })

    it("月給 + 万単位 + 範囲", () => {
      expect(parseSalaryText("月給25万円〜30万円")).toEqual({
        type: "monthly",
        min: 250_000,
        max: 300_000,
      })
    })

    it("月給 + 単一値", () => {
      expect(parseSalaryText("月給 200,000円")).toEqual({
        type: "monthly",
        min: 200_000,
        max: null,
      })
    })

    it("月給 + 円記号 + チルダ", () => {
      expect(parseSalaryText("月給 ¥250,000～¥300,000")).toEqual({
        type: "monthly",
        min: 250_000,
        max: 300_000,
      })
    })

    it("全角数字", () => {
      expect(parseSalaryText("月給２５万円")).toEqual({
        type: "monthly",
        min: 250_000,
        max: null,
      })
    })
  })

  describe("時給", () => {
    it("時給 + カンマ区切り + 範囲", () => {
      expect(parseSalaryText("時給1,200円〜1,500円")).toEqual({
        type: "hourly",
        min: 1_200,
        max: 1_500,
      })
    })

    it("時給 + 単一値", () => {
      expect(parseSalaryText("時給1,200円")).toEqual({
        type: "hourly",
        min: 1_200,
        max: null,
      })
    })
  })

  describe("日給", () => {
    it("日給 + カンマ区切り + 範囲", () => {
      expect(parseSalaryText("日給12,000円〜18,000円")).toEqual({
        type: "daily",
        min: 12_000,
        max: 18_000,
      })
    })

    it("日給 + 万単位", () => {
      expect(parseSalaryText("日給1万2,000円")).toEqual({
        type: "daily",
        min: 12_000,
        max: null,
      })
    })
  })

  describe("年俸", () => {
    it("年俸 + 万単位", () => {
      expect(parseSalaryText("年俸500万円")).toEqual({
        type: "annual",
        min: 5_000_000,
        max: null,
      })
    })

    it("年収 + 範囲", () => {
      expect(parseSalaryText("年収400万円〜600万円")).toEqual({
        type: "annual",
        min: 4_000_000,
        max: 6_000_000,
      })
    })
  })

  describe("試用期間など括弧書きを除外", () => {
    it("月給 + 試用期間表記", () => {
      expect(
        parseSalaryText("月給250,000円〜300,000円（試用期間中：220,000円）")
      ).toEqual({
        type: "monthly",
        min: 250_000,
        max: 300_000,
      })
    })

    it("時給 + 半角括弧の補足", () => {
      expect(parseSalaryText("時給1,200円(交通費別途)")).toEqual({
        type: "hourly",
        min: 1_200,
        max: null,
      })
    })
  })

  describe("ノイズ数値の除外", () => {
    it("年齢・年号などレンジ外の数値は無視", () => {
      // "65歳" の 65 / "2024年" の 2024 などは hourly レンジ(500-50000)外
      expect(parseSalaryText("時給1,200円 (65歳まで応募可、2024年募集)")).toEqual({
        type: "hourly",
        min: 1_200,
        max: null,
      })
    })

    it("月給で hourly 桁の数値は無視されない（タイプ別レンジ）", () => {
      // monthly レンジ(50000-5000000)外の "65" は除外される
      const result = parseSalaryText("月給25万円 65歳まで応募可")
      expect(result.type).toBe("monthly")
      expect(result.min).toBe(250_000)
    })
  })

  describe("エッジケース", () => {
    it("null / undefined / 空文字", () => {
      expect(parseSalaryText(null)).toEqual({ type: null, min: null, max: null })
      expect(parseSalaryText(undefined)).toEqual({
        type: null,
        min: null,
        max: null,
      })
      expect(parseSalaryText("")).toEqual({ type: null, min: null, max: null })
      expect(parseSalaryText("   ")).toEqual({
        type: null,
        min: null,
        max: null,
      })
    })

    it("賃金種別が判定できない", () => {
      const r = parseSalaryText("250,000円")
      expect(r.type).toBe(null)
      // type が null だと汎用境界(500-5000万)で判定 → 250000 は採用
      expect(r.min).toBe(250_000)
    })

    it("数値がない", () => {
      expect(parseSalaryText("月給 応相談")).toEqual({
        type: "monthly",
        min: null,
        max: null,
      })
    })

    it("min > max になっていたら入れ替え", () => {
      // "月給30万円〜25万円" のような誤入力
      expect(parseSalaryText("月給30万円〜25万円")).toEqual({
        type: "monthly",
        min: 250_000,
        max: 300_000,
      })
    })
  })

  describe("回帰: 既存の構造化済みケース", () => {
    it("month や hour を含まない補足表現", () => {
      // 月給/時給などのキーワードがない場合 type=null
      const r = parseSalaryText("月収目安 250000~300000")
      expect(r.min).toBe(250_000)
      expect(r.max).toBe(300_000)
    })
  })
})
