import { describe, it, expect } from "vitest"
import {
  buildScoutExpiry,
  buildScoutSubject,
  buildScoutExcerpt,
  canSendScout,
  scoutInputSchema,
  SCOUT_BODY_MIN,
  SCOUT_BODY_MAX,
} from "@/lib/scouts"

describe("buildScoutExpiry", () => {
  it("returns date 30 days after sentAt", () => {
    const sent = new Date("2026-05-21T00:00:00Z")
    const exp = buildScoutExpiry(sent)
    const diffDays = Math.round(
      (exp.getTime() - sent.getTime()) / (24 * 60 * 60 * 1000),
    )
    expect(diffDays).toBe(30)
  })
})

describe("buildScoutSubject", () => {
  it("uses fixed Mynavi-style format", () => {
    const subject = buildScoutSubject("株式会社サンプル")
    expect(subject).toBe(
      "株式会社サンプルからスカウトが届きました![ゲンバキャリア / スカウト着信通知]"
        .replace("!", "！"),
    )
  })
})

describe("buildScoutExcerpt", () => {
  it("flattens whitespace and truncates with ellipsis", () => {
    const long = "あ".repeat(150)
    const result = buildScoutExcerpt(long, 120)
    expect(result.endsWith("...")).toBe(true)
    expect(result.length).toBe(123)
  })

  it("returns full text when shorter than max", () => {
    const short = "短い本文"
    expect(buildScoutExcerpt(short, 120)).toBe("短い本文")
  })

  it("collapses newlines to single space", () => {
    const text = "line1\n\nline2\n  line3"
    expect(buildScoutExcerpt(text, 120)).toBe("line1 line2 line3")
  })
})

describe("canSendScout", () => {
  it("returns true for active job + searching user", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: { status: "active", jobSearchStatus: "searching", profilePublic: true },
      }),
    ).toBe(true)
  })

  it("returns true for employed_open user", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: { status: "active", jobSearchStatus: "employed_open", profilePublic: true },
      }),
    ).toBe(true)
  })

  it("returns false for closed job", () => {
    expect(
      canSendScout({
        job: { status: "closed" },
        user: { status: "active", jobSearchStatus: "searching", profilePublic: true },
      }),
    ).toBe(false)
  })

  it("returns false for hired user", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: { status: "active", jobSearchStatus: "hired", profilePublic: true },
      }),
    ).toBe(false)
  })

  it("returns false for suspended user", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: { status: "suspended", jobSearchStatus: "searching", profilePublic: true },
      }),
    ).toBe(false)
  })

  it("returns false when profile is not public, even if otherwise eligible", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: { status: "active", jobSearchStatus: "searching", profilePublic: false },
      }),
    ).toBe(false)
  })

  it("returns false for null inputs", () => {
    expect(canSendScout({ job: null, user: null })).toBe(false)
  })
})

describe("scoutInputSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000"

  it("accepts valid input", () => {
    const result = scoutInputSchema.safeParse({
      jobId: validUUID,
      userId: validUUID,
      body: "あ".repeat(SCOUT_BODY_MIN),
    })
    expect(result.success).toBe(true)
  })

  it("rejects body shorter than min", () => {
    const result = scoutInputSchema.safeParse({
      jobId: validUUID,
      userId: validUUID,
      body: "a".repeat(SCOUT_BODY_MIN - 1),
    })
    expect(result.success).toBe(false)
  })

  it("rejects body longer than max", () => {
    const result = scoutInputSchema.safeParse({
      jobId: validUUID,
      userId: validUUID,
      body: "a".repeat(SCOUT_BODY_MAX + 1),
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid UUID", () => {
    const result = scoutInputSchema.safeParse({
      jobId: "not-a-uuid",
      userId: validUUID,
      body: "a".repeat(SCOUT_BODY_MIN),
    })
    expect(result.success).toBe(false)
  })
})
