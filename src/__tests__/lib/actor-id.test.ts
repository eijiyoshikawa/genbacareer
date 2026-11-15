import { describe, it, expect } from "vitest"
import { toActorUuid } from "@/lib/actor-id"

describe("toActorUuid", () => {
  it("有効な UUID はそのまま返す", () => {
    const uuid = "550e8400-e29b-41d4-a716-446655440000"
    expect(toActorUuid(uuid)).toBe(uuid)
  })

  it("大文字の UUID もそのまま返す（DB 側は case-insensitive）", () => {
    const uuid = "550E8400-E29B-41D4-A716-446655440000"
    expect(toActorUuid(uuid)).toBe(uuid)
  })

  it("admin-credentials ログインの固定文字列 'admin' は null にフォールバック", () => {
    expect(toActorUuid("admin")).toBeNull()
  })

  it("null / undefined / 空文字は null", () => {
    expect(toActorUuid(null)).toBeNull()
    expect(toActorUuid(undefined)).toBeNull()
    expect(toActorUuid("")).toBeNull()
  })

  it("UUID 以外の任意文字列は null", () => {
    expect(toActorUuid("not-a-uuid")).toBeNull()
    expect(toActorUuid("12345")).toBeNull()
  })
})
