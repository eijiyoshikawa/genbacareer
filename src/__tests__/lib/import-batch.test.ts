import { describe, it, expect } from "vitest"
import { inferCategory } from "@/lib/crawler/import-batch"

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

    it("blocks 介護・介助業務（入居者・見守りを含む施設系）", () => {
      // 実際にハローワークから取り込まれた問題求人の再現
      expect(
        inferCategory(
          "■入居者様とのコミュニケーションの中で掃除・洗濯・見守りなどの介助業務を行って頂きます",
          null
        )
      ).toBe(null)
      expect(inferCategory("介護スタッフ", null)).toBe(null)
      expect(inferCategory("介護職員募集", null)).toBe(null)
      expect(inferCategory("介護福祉士", null)).toBe(null)
      expect(inferCategory("訪問介護スタッフ", null)).toBe(null)
      expect(inferCategory("ホームヘルパー", null)).toBe(null)
      expect(inferCategory("看護助手", null)).toBe(null)
    })

    it("blocks 障害児・通所支援・療育（児童福祉系）", () => {
      // 実際にハローワークから取り込まれた問題求人の再現
      expect(
        inferCategory(
          "＊1日10名のお子様が通所する障害児通所支援施設です",
          null
        )
      ).toBe(null)
      expect(inferCategory("障害児通所支援職員", null)).toBe(null)
      expect(inferCategory("放課後等デイサービス指導員", null)).toBe(null)
      expect(inferCategory("放課後デイ職員", null)).toBe(null)
      expect(inferCategory("児童発達支援管理責任者", null)).toBe(null)
      expect(inferCategory("デイサービススタッフ", null)).toBe(null)
      expect(inferCategory("デイケア職員", null)).toBe(null)
      expect(inferCategory("療育スタッフ", null)).toBe(null)
    })

    it("blocks 美容・理容・エステ", () => {
      expect(inferCategory("美容師", null)).toBe(null)
      expect(inferCategory("理容師スタッフ", null)).toBe(null)
      expect(inferCategory("ネイリスト募集", null)).toBe(null)
      expect(inferCategory("エステティシャン", null)).toBe(null)
    })

    it("blocks 販売・接客・飲食ホール", () => {
      expect(inferCategory("販売スタッフ", null)).toBe(null)
      expect(inferCategory("アパレル販売", null)).toBe(null)
      expect(inferCategory("ホールスタッフ", null)).toBe(null)
      expect(inferCategory("レジスタッフ", null)).toBe(null)
    })

    it("blocks 医療事務・薬剤師", () => {
      expect(inferCategory("医療事務スタッフ", null)).toBe(null)
      expect(inferCategory("調剤事務", null)).toBe(null)
      expect(inferCategory("薬剤師募集", null)).toBe(null)
    })

    it("keeps construction at care facility (介護施設の建設工事は対象内)", () => {
      // 「介護」単体は誤ブロックを生むため、「介護スタッフ」など具体名のみブロック
      expect(inferCategory("介護施設の電気工事士", null)).toBe("electrical")
      expect(inferCategory("老人ホーム新築の鳶職人", null)).toBe("construction")
    })

    it("keeps construction-related drivers (重機/ダンプ/クレーン)", () => {
      // 除外パターンと衝突しないことを確認
      expect(inferCategory("重機ドライバー", null)).toBe("driver")
      expect(inferCategory("ダンプドライバー", null)).toBe("driver")
      expect(inferCategory("クレーンオペレーター", null)).toBe("driver")
      expect(inferCategory("重機オペレーター", null)).toBe("driver")
    })
  })

  describe("precision: fixes false positives without over-blocking", () => {
    // 「衛生」単独の誤マッチ（歯科・口腔・食品）を除去しつつ建設の衛生設備は維持
    it("does not classify 歯科/口腔 jobs as electrical via 衛生", () => {
      // 実際にハローワークから取り込まれた歯科求人の再現
      expect(
        inferCategory(
          "口腔内の検査および衛生指導　歯石除去やクリーニングなどの予防処置　診療補助",
          null
        )
      ).toBe(null)
      expect(inferCategory("歯科衛生士募集", null)).toBe(null)
      expect(inferCategory("歯科助手", null)).toBe(null)
      expect(inferCategory("口腔ケアスタッフ", "衛生指導を行います")).toBe(null)
    })

    it("keeps 給排水衛生設備 construction jobs as electrical", () => {
      expect(inferCategory("衛生設備配管工事", null)).toBe("electrical")
      expect(inferCategory("給排水衛生設備工事", null)).toBe("electrical")
      expect(inferCategory("給排水設備の施工", null)).toBe("electrical")
    })

    // IT / ソフトウェア開発の誤分類を除去（全角表記も正規化後にマッチ）
    it("blocks IT / software jobs even with full-width letters", () => {
      expect(
        inferCategory(
          "当社はシステムエンジニアリングサービス（ＳＥＳ）を中心としたＩＴソリューション事業を展開しております",
          "システム設計から開発まで"
        )
      ).toBe(null)
      expect(inferCategory("システムエンジニア募集", null)).toBe(null)
      expect(inferCategory("Ｗｅｂエンジニア（Ｒｅａｃｔ）", null)).toBe(null)
      // ハローワークのタイトルは長文（本文を含む）。ブロックはタイトル判定なので
      // 「ソフトウェア」がタイトルにあれば、本文の「設計」で survey 誤分類される前に除外される
      expect(
        inferCategory(
          "防犯用ビデオカメラ開発の作業。設計～テストまでの対応。ソフトウェアパッケージの開発",
          null
        )
      ).toBe(null)
      expect(inferCategory("インフラエンジニア", null)).toBe(null)
    })

    it("still classifies construction 設計/CAD/測量 as survey", () => {
      // IT ブロックは複合語限定なので、建設の「設計」は survey のまま
      expect(inferCategory("設計補助", null)).toBe("survey")
      expect(inferCategory("建築設計スタッフ", null)).toBe("survey")
      expect(inferCategory("測量士", null)).toBe("survey")
      // 全角 CAD も正規化されて survey
      expect(inferCategory("ＣＡＤオペレーター", null)).toBe("survey")
    })

    // 「オペレーター」単独の誤マッチ（電話/PC/製造）を除去しつつ建設機械は維持
    it("does not classify 製造/事務 operators as driver", () => {
      expect(inferCategory("製造オペレーター", null)).toBe(null)
      expect(inferCategory("機械オペレーター", null)).toBe(null)
      expect(inferCategory("マシンオペレーター募集", null)).toBe(null)
      expect(inferCategory("PCオペレーター", null)).toBe(null)
    })

    it("keeps 建設機械 operators as driver (重機/クレーン/建機/ショベル)", () => {
      expect(inferCategory("重機オペレーター", null)).toBe("driver")
      expect(inferCategory("クレーンオペレーター", null)).toBe("driver")
      expect(inferCategory("建機オペレーター", null)).toBe("driver")
      expect(inferCategory("油圧ショベルオペレーター", null)).toBe("driver")
    })

    // dry-run で検出した偽ブロックのリグレッション（建設求人を null にしない）
    it("does NOT block 建設機械オペレーター (regression: 機械オペレータ block)", () => {
      expect(inferCategory("建設機械オペレータ", null)).toBe("driver")
      expect(inferCategory("建設機械オペレーター", null)).toBe("driver")
      expect(inferCategory("経験者採用 地域を支える建設機械オペレーター／枕崎市", null)).toBe(
        "driver"
      )
      // 土木が先にマッチするケースも null にはならない
      expect(inferCategory("土木作業員・建設機械オペレーター 資格取得支援制度有", null)).toBe(
        "civil"
      )
    })

    it("does NOT block 建設の客先常駐求人 (regression: 客先常駐 block)", () => {
      expect(inferCategory("（派）客先常駐型！ 建築施工管理 （長野市）", null)).toBe(
        "management"
      )
    })

    it("does NOT block 空調システム設計 (regression: システム設計 block)", () => {
      expect(inferCategory("空調システム設計エンジニア", null)).toBe("electrical")
    })

    it("does NOT block 土木インフラ jobs (regression: インフラエンジニア block)", () => {
      // 「インフラ」「ネットワーク」は土木インフラ/通信設備と両義のため、
      // 土木キーワードがあれば建設として維持する
      // 「土木」は civil が施工管理(management)より先にマッチする
      expect(inferCategory("インフラエンジニア（２級土木施工管理技士～）", null)).toBe(
        "civil"
      )
      expect(inferCategory("インフラエンジニア（土木施工管理技士） 橋梁補修", null)).toBe(
        "civil"
      )
      // 建設キーワードの無い純IT/通信は引き続き null（除外）
      expect(inferCategory("インフラエンジニア", null)).toBe(null)
      expect(inferCategory("通信ネットワークエンジニア／八代", null)).toBe(null)
    })

    it("still nulls manufacturing operators with no construction keyword", () => {
      expect(inferCategory("プラスチック射出成型 テクニカルオペレーター", null)).toBe(null)
      expect(inferCategory("ソーイングオペレーター", null)).toBe(null)
      expect(inferCategory("機械オペレーター", null)).toBe(null)
    })
  })
})
