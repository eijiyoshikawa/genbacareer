import { describe, it, expect } from "vitest"
import {
  buildScoutExpiry,
  buildScoutSubject,
  buildScoutExcerpt,
  canSendScout,
  isScoutEffectivelyExpired,
  scoutInputSchema,
  SCOUT_BODY_MIN,
  SCOUT_BODY_MAX,
} from "@/lib/scouts"

const COMPANY_ID = "11111111-1111-1111-1111-111111111111"
const OTHER_COMPANY_ID = "22222222-2222-2222-2222-222222222222"

function baseUser(overrides: Partial<{
  status: string
  jobSearchStatus: string
  profilePublic: boolean
  blockedCompanyIds: string[]
}> = {}) {
  return {
    status: "active",
    jobSearchStatus: "searching",
    profilePublic: true,
    blockedCompanyIds: [],
    ...overrides,
  }
}

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
        user: baseUser(),
        companyId: COMPANY_ID,
      }),
    ).toBe(true)
  })

  it("returns true for employed_open user", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: baseUser({ jobSearchStatus: "employed_open" }),
        companyId: COMPANY_ID,
      }),
    ).toBe(true)
  })

  it("returns false for closed job", () => {
    expect(
      canSendScout({
        job: { status: "closed" },
        user: baseUser(),
        companyId: COMPANY_ID,
      }),
    ).toBe(false)
  })

  it("returns false for hired user", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: baseUser({ jobSearchStatus: "hired" }),
        companyId: COMPANY_ID,
      }),
    ).toBe(false)
  })

  it("returns false for suspended user", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: baseUser({ status: "suspended" }),
        companyId: COMPANY_ID,
      }),
    ).toBe(false)
  })

  it("returns false for null inputs", () => {
    expect(canSendScout({ job: null, user: null, companyId: COMPANY_ID })).toBe(false)
  })

  it("returns false for a user with profilePublic=false (opted out of visibility)", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: baseUser({ profilePublic: false }),
        companyId: COMPANY_ID,
      }),
    ).toBe(false)
  })

  it("returns false when the user has blocked this company", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: baseUser({ blockedCompanyIds: [COMPANY_ID] }),
        companyId: COMPANY_ID,
      }),
    ).toBe(false)
  })

  it("returns true when the user has blocked a different company", () => {
    expect(
      canSendScout({
        job: { status: "active" },
        user: baseUser({ blockedCompanyIds: [OTHER_COMPANY_ID] }),
        companyId: COMPANY_ID,
      }),
    ).toBe(true)
  })
})

describe("isScoutEffectivelyExpired", () => {
  it("returns true when status is already 'expired'", () => {
    expect(
      isScoutEffectivelyExpired({
        status: "expired",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      }),
    ).toBe(true)
  })

  it("returns true when expiresAt is in the past even if status is still 'sent'/'read' (cron hasn't caught up yet)", () => {
    expect(
      isScoutEffectivelyExpired({
        status: "sent",
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).toBe(true)
    expect(
      isScoutEffectivelyExpired({
        status: "read",
        expiresAt: new Date(Date.now() - 1000),
      }),
    ).toBe(true)
  })

  it("returns false when status is active and expiresAt is in the future", () => {
    expect(
      isScoutEffectivelyExpired({
        status: "sent",
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      }),
    ).toBe(false)
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
