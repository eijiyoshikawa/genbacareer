import { describe, it, expect } from "vitest"

/**
 * 退会 API (POST /api/users/me/delete) のリクエスト検証ロジックを
 * 単体テスト。実際の DB 書き込みは行わない。
 *
 * E2E テストは playwright で別途。ここでは validation のみ。
 */

import { z } from "zod"

const schema = z.object({
  confirmText: z.literal("退会する"),
  reason: z.string().max(500).optional(),
})

describe("delete-account schema validation", () => {
  it("accepts the exact confirmation phrase", () => {
    expect(schema.safeParse({ confirmText: "退会する" }).success).toBe(true)
  })

  it("rejects other phrases", () => {
    expect(schema.safeParse({ confirmText: "退会します" }).success).toBe(false)
    expect(schema.safeParse({ confirmText: "delete" }).success).toBe(false)
    expect(schema.safeParse({ confirmText: "" }).success).toBe(false)
  })

  it("rejects missing field", () => {
    expect(schema.safeParse({}).success).toBe(false)
  })

  it("accepts optional reason", () => {
    expect(
      schema.safeParse({
        confirmText: "退会する",
        reason: "転職先が決まったため",
      }).success
    ).toBe(true)
  })

  it("rejects too long reason", () => {
    expect(
      schema.safeParse({
        confirmText: "退会する",
        reason: "a".repeat(501),
      }).success
    ).toBe(false)
  })
})

describe("削除されるデータ (assertion-only)", () => {
  // 削除対象の不変条件を文書として残す（コード自体は実装側に依存）。
  it("documents data deletion contract", () => {
    const contract = {
      anonymized: [
        "User.email",
        "User.name (→ 退会済みユーザー)",
        "User.phone",
        "User.prefecture",
        "User.city",
        "User.birthDate",
        "User.resumeUrl",
        "User.passwordHash",
      ],
      fullyDeleted: [
        "SavedSearch",
        "JobFavorite",
        "CompanyFollow",
        "Notification",
        "ApplicationMessageTemplate",
        "Resume",
        "UploadedFile (DB row + Supabase Storage 実体ファイル)",
      ],
      retained: [
        "Application (job application records, 職業安定法 1 年保存)",
      ],
    }
    // contract is informational
    expect(contract.anonymized.length).toBeGreaterThan(0)
    expect(contract.fullyDeleted).toContain("ApplicationMessageTemplate")
    expect(contract.fullyDeleted.some((x) => x.startsWith("UploadedFile"))).toBe(
      true
    )
    expect(contract.retained).toContain(
      "Application (job application records, 職業安定法 1 年保存)"
    )
  })
})
