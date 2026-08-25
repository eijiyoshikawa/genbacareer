import { describe, it, expect } from "vitest"
import {
  inferCategory,
  shouldSkipCloseOrphansForSafety,
} from "@/lib/crawler/import-batch"

describe("inferCategory", () => {
  it("classifies civil engineering keywords", () => {
    expect(inferCategory("土木作業員募集", null)).toBe("civil")
    expect(inferCategory("道路舗装工事スタッフ", null)).toBe("civil")
    expect(inferCategory("橋梁トンネル工事", null)).toBe("civil")
  })

  it("classifies electrical keywords", () => {
    expect(inferCategory("電気工事士", null)).toBe("electrical")
    expect(inferCategory("空調設備工事", null)).toBe("electrical")
    expect(inferCategory("配管工", null)).toBe("electrical")
  })

  it("classifies interior keywords", () => {
    expect(inferCategory("内装仕上げ職人", null)).toBe("interior")
    expect(inferCategory("クロス職人募集", null)).toBe("interior")
    expect(inferCategory("左官工事", null)).toBe("interior")
  })

  it("classifies demolition keywords", () => {
    expect(inferCategory("解体作業員", null)).toBe("demolition")
    expect(inferCategory("アスベスト除去作業", null)).toBe("demolition")
  })

  it("classifies driver/heavy equipment keywords", () => {
    expect(inferCategory("ダンプドライバー", null)).toBe("driver")
    expect(inferCategory("クレーンオペレーター", null)).toBe("driver")
    expect(inferCategory("重機オペレーター", null)).toBe("driver")
  })

  it("classifies management keywords", () => {
    expect(inferCategory("施工管理技士", null)).toBe("management")
    expect(inferCategory("現場監督募集", null)).toBe("management")
    expect(inferCategory("工事主任", null)).toBe("management")
  })

  it("classifies survey/design keywords", () => {
    expect(inferCategory("測量士", null)).toBe("survey")
    expect(inferCategory("建築CAD職員", null)).toBe("survey")
    expect(inferCategory("設計補助", null)).toBe("survey")
    expect(inferCategory("積算スタッフ", null)).toBe("survey")
  })

  it("classifies general construction keywords", () => {
    expect(inferCategory("建築躯体工事", null)).toBe("construction")
    expect(inferCategory("鳶職人募集", null)).toBe("construction")
    expect(inferCategory("鉄筋工", null)).toBe("construction")
    expect(inferCategory("型枠大工", null)).toBe("construction")
  })

  it("returns null for non-construction jobs (manufacturing, office, IT, etc.)", () => {
    expect(inferCategory("一般事務員", null)).toBe(null)
    expect(inferCategory("Web エンジニア募集", null)).toBe(null)
    expect(inferCategory("看護師", null)).toBe(null)
    expect(inferCategory("コンビニ店員", null)).toBe(null)
    expect(inferCategory("プログラマ", "Python での開発")).toBe(null)
  })

  it("uses description text as fallback", () => {
    expect(
      inferCategory("作業員募集", "東京都内の解体現場でのお仕事です")
    ).toBe("demolition")
  })

  it("prioritizes more specific categories before construction", () => {
    // 「建築躯体工事の解体作業」のような複合ケースで先に解体が拾われる
    expect(inferCategory("解体現場の躯体作業", null)).toBe("demolition")
    // 土木 + 建築 → civil が先（より具体的）
    expect(inferCategory("土木建築工事スタッフ", null)).toBe("civil")
  })

  it("handles missing description gracefully", () => {
    expect(inferCategory("土木作業員", null)).toBe("civil")
    expect(inferCategory("土木作業員", undefined)).toBe("civil")
    expect(inferCategory("土木作業員", "")).toBe("civil")
  })

  describe("excludes blocked occupations even if construction keywords appear", () => {
    it("blocks 配送・タクシー・バス drivers", () => {
      expect(inferCategory("配送ドライバー", null)).toBe(null)
      expect(inferCategory("宅配スタッフ", null)).toBe(null)
      expect(inferCategory("ルート配送員", null)).toBe(null)
      expect(inferCategory("軽貨物ドライバー", null)).toBe(null)
      expect(inferCategory("タクシードライバー", null)).toBe(null)
      expect(inferCategory("タクシー運転手", null)).toBe(null)
      expect(inferCategory("路線バス運転手", null)).toBe(null)
      expect(inferCategory("観光バスドライバー", null)).toBe(null)
      expect(inferCategory("スクールバス運転手", null)).toBe(null)
    })

    it("blocks 消防士 but keeps 消防設備工事", () => {
      expect(inferCategory("消防士募集", null)).toBe(null)
      expect(inferCategory("消防職員", null)).toBe(null)
      expect(inferCategory("救急救命士", null)).toBe(null)
      // 消防「設備」工事は electrical で取り込む
      expect(inferCategory("消防設備工事スタッフ", null)).toBe("electrical")
      expect(inferCategory("消防設備士", null)).toBe("electrical")
    })

    it("blocks コールセンター系", () => {
      expect(inferCategory("コールセンタースタッフ", null)).toBe(null)
      expect(inferCategory("電話オペレーター", null)).toBe(null)
      expect(inferCategory("テレマーケティング担当", null)).toBe(null)
      expect(inferCategory("カスタマーサポート", null)).toBe(null)
      expect(inferCategory("受電業務スタッフ", null)).toBe(null)
    })

    it("blocks 介護送迎・送迎ドライバー", () => {
      expect(inferCategory("介護送迎ドライバー", null)).toBe(null)
      expect(inferCategory("福祉送迎運転手", null)).toBe(null)
      expect(inferCategory("送迎ドライバー", null)).toBe(null)
      expect(inferCategory("送迎スタッフ", null)).toBe(null)
    })

    it("blocks 食品衛生・衛生管理者 but keeps 衛生設備配管", () => {
      expect(inferCategory("食品工場スタッフ", null)).toBe(null)
      expect(inferCategory("食品衛生管理者", null)).toBe(null)
      expect(inferCategory("調理補助", null)).toBe(null)
      expect(inferCategory("厨房スタッフ", null)).toBe(null)
      expect(inferCategory("衛生管理者", null)).toBe(null)
      // 衛生「設備」配管工事は electrical で取り込む
      expect(inferCategory("衛生設備配管工事", null)).toBe("electrical")
    })

    it("blocks 保育士・幼稚園教諭", () => {
      expect(inferCategory("保育士", null)).toBe(null)
      expect(inferCategory("保育補助スタッフ", null)).toBe(null)
      expect(inferCategory("幼稚園教諭", null)).toBe(null)
      expect(inferCategory("保育教諭", null)).toBe(null)
      expect(inferCategory("学童指導員", null)).toBe(null)
      expect(inferCategory("ベビーシッター", null)).toBe(null)
    })

    it("keeps construction-related drivers (重機/ダンプ/クレーン)", () => {
      // 除外パターンと衝突しないことを確認
      expect(inferCategory("重機ドライバー", null)).toBe("driver")
      expect(inferCategory("ダンプドライバー", null)).toBe("driver")
      expect(inferCategory("クレーンオペレーター", null)).toBe("driver")
      expect(inferCategory("重機オペレーター", null)).toBe("driver")
    })
  })
})

describe("shouldSkipCloseOrphansForSafety", () => {
  // ローテーション取り込み (毎回 2〜5 ページ ≒ 2000〜5000 件) に対して
  // 誤って closeOrphans=true が渡された場合、既存のアクティブな HW 求人
  // 数十万件のほぼ全件を closed にしてしまう。これを防ぐ安全装置。

  it("skips when a tiny rotation batch would orphan almost everything", () => {
    // 全国 36 万件のうち、今回はたった 2000 件しか処理していない
    expect(shouldSkipCloseOrphansForSafety(358000, 2000)).toBe(true)
  })

  it("does NOT skip a genuine full sweep (candidates comparable to processed)", () => {
    // 360000 件処理し、実際にハローワーク側で消えたのはごく僅か
    expect(shouldSkipCloseOrphansForSafety(120, 360000)).toBe(false)
  })

  it("does NOT skip when candidate count is below the absolute floor", () => {
    // 小規模な通常の削除 (閾値以下) は素通しする
    expect(shouldSkipCloseOrphansForSafety(400, 10)).toBe(false)
  })

  it("does NOT skip when candidates are not disproportionate to processed", () => {
    // 候補が処理件数の 3 倍以下なら通常の運用範囲とみなす
    expect(shouldSkipCloseOrphansForSafety(1500, 600)).toBe(false)
  })

  it("skips right at the boundary above both thresholds", () => {
    expect(shouldSkipCloseOrphansForSafety(1501, 500)).toBe(true)
  })
})
