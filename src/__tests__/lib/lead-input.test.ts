import { describe, it, expect } from "vitest"
import { leadValidationMessage, normalizeLeadPhone } from "@/lib/lead-input"
import { isPlaceholderEmail } from "@/lib/email"

describe("normalizeLeadPhone", () => {
  it("全角数字と全角ハイフン・長音を半角に揃える", () => {
    expect(normalizeLeadPhone("０９０－１２３４ー５６７８")).toBe("090-1234-5678")
  })
  it("半角入力はそのまま", () => {
    expect(normalizeLeadPhone(" 03-1234-5678 ")).toBe("03-1234-5678")
  })
})

describe("leadValidationMessage", () => {
  it("利用者の入力項目のメッセージを返す", () => {
    expect(
      leadValidationMessage([
        { path: ["jobId"], message: "Invalid UUID" },
        { path: ["phone"], message: "電話番号は 8 桁以上で入力してください" },
      ])
    ).toBe("電話番号は 8 桁以上で入力してください")
  })
  it("内部項目だけのエラーは汎用文言にする", () => {
    expect(
      leadValidationMessage([{ path: ["accessToken"], message: "Too small" }])
    ).toBe("入力内容をご確認のうえ、もう一度お試しください。")
  })
})

describe("isPlaceholderEmail", () => {
  it("LINE ログイン / 退会済みのプレースホルダーを判定する", () => {
    expect(isPlaceholderEmail("line_U123@line.local")).toBe(true)
    expect(isPlaceholderEmail("deleted+abc@deleted.local")).toBe(true)
    expect(isPlaceholderEmail("taro@example.com")).toBe(false)
  })
})
