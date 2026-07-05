import { describe, it, expect } from "vitest"
import {
  parseAllowlist,
  extractClientIp,
  ipMatches,
  isAdminAccessAllowed,
} from "@/lib/admin-ip-allowlist"

describe("parseAllowlist", () => {
  it("returns empty array for undefined / empty", () => {
    expect(parseAllowlist(undefined)).toEqual([])
    expect(parseAllowlist("")).toEqual([])
    expect(parseAllowlist(" ")).toEqual([])
  })

  it("splits by comma and trims whitespace", () => {
    expect(parseAllowlist("1.2.3.4, 5.6.7.0/24 ,8.8.8.8")).toEqual([
      "1.2.3.4",
      "5.6.7.0/24",
      "8.8.8.8",
    ])
  })
})

describe("extractClientIp", () => {
  function mockHeaders(map: Record<string, string>) {
    return {
      get: (name: string) => map[name.toLowerCase()] ?? null,
    }
  }

  it("returns last IP from x-forwarded-for (trust nearest hop, not client-supplied value)", () => {
    // "1.2.3.4" ここは攻撃者が自分で送ってきた偽装値かもしれない。
    // 最後の "10.0.0.1" が実際に接続してきた相手 (最も信頼できるホップ)。
    const h = mockHeaders({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" })
    expect(extractClientIp(h)).toBe("10.0.0.1")
  })

  it("prefers x-vercel-forwarded-for over x-forwarded-for", () => {
    const h = mockHeaders({
      "x-vercel-forwarded-for": "203.0.113.10",
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
    })
    expect(extractClientIp(h)).toBe("203.0.113.10")
  })

  it("falls back to x-real-ip", () => {
    const h = mockHeaders({ "x-real-ip": "5.6.7.8" })
    expect(extractClientIp(h)).toBe("5.6.7.8")
  })

  it("returns null when all headers missing", () => {
    expect(extractClientIp(mockHeaders({}))).toBeNull()
  })
})

describe("ipMatches", () => {
  it("matches exact IPv4", () => {
    expect(ipMatches("1.2.3.4", "1.2.3.4")).toBe(true)
    expect(ipMatches("1.2.3.5", "1.2.3.4")).toBe(false)
  })

  it("matches IPv4 in /24 CIDR", () => {
    expect(ipMatches("192.168.1.10", "192.168.1.0/24")).toBe(true)
    expect(ipMatches("192.168.2.10", "192.168.1.0/24")).toBe(false)
  })

  it("matches IPv4 in /16 CIDR", () => {
    expect(ipMatches("10.0.5.99", "10.0.0.0/16")).toBe(true)
    expect(ipMatches("10.1.5.99", "10.0.0.0/16")).toBe(false)
  })

  it("matches IPv4 in /32 CIDR (exact)", () => {
    expect(ipMatches("1.2.3.4", "1.2.3.4/32")).toBe(true)
    expect(ipMatches("1.2.3.5", "1.2.3.4/32")).toBe(false)
  })

  it("matches IPv4 in /0 (all)", () => {
    expect(ipMatches("8.8.8.8", "0.0.0.0/0")).toBe(true)
  })

  it("rejects invalid IPv4 input", () => {
    expect(ipMatches("not-an-ip", "1.2.3.4")).toBe(false)
    expect(ipMatches("1.2.3.4", "not-cidr/24")).toBe(false)
  })

  it("matches IPv6 prefix loosely", () => {
    expect(ipMatches("2001:db8::1", "2001:db8::/32")).toBe(true)
    expect(ipMatches("2001:dead::1", "2001:db8::/32")).toBe(false)
  })
})

describe("isAdminAccessAllowed", () => {
  it("allows when allowlist is empty (backup behavior)", () => {
    expect(
      isAdminAccessAllowed({
        clientIp: "1.2.3.4",
        allowlist: [],
        isDevelopment: false,
      }),
    ).toBe(true)
  })

  it("allows IP that matches an entry", () => {
    expect(
      isAdminAccessAllowed({
        clientIp: "203.0.113.10",
        allowlist: ["203.0.113.0/24"],
        isDevelopment: false,
      }),
    ).toBe(true)
  })

  it("blocks IP not in allowlist", () => {
    expect(
      isAdminAccessAllowed({
        clientIp: "8.8.8.8",
        allowlist: ["203.0.113.0/24"],
        isDevelopment: false,
      }),
    ).toBe(false)
  })

  it("blocks when client IP cannot be determined", () => {
    expect(
      isAdminAccessAllowed({
        clientIp: null,
        allowlist: ["203.0.113.0/24"],
        isDevelopment: false,
      }),
    ).toBe(false)
  })

  it("allows loopback in development even if not in allowlist", () => {
    expect(
      isAdminAccessAllowed({
        clientIp: "127.0.0.1",
        allowlist: ["203.0.113.0/24"],
        isDevelopment: true,
      }),
    ).toBe(true)
    expect(
      isAdminAccessAllowed({
        clientIp: "::1",
        allowlist: ["203.0.113.0/24"],
        isDevelopment: true,
      }),
    ).toBe(true)
  })

  it("blocks loopback in production if not in allowlist", () => {
    expect(
      isAdminAccessAllowed({
        clientIp: "127.0.0.1",
        allowlist: ["203.0.113.0/24"],
        isDevelopment: false,
      }),
    ).toBe(false)
  })

  it("accepts mixed entries (exact IP + CIDR)", () => {
    const allowlist = ["1.2.3.4", "10.0.0.0/8", "192.168.1.0/24"]
    expect(
      isAdminAccessAllowed({ clientIp: "1.2.3.4", allowlist, isDevelopment: false }),
    ).toBe(true)
    expect(
      isAdminAccessAllowed({ clientIp: "10.5.5.5", allowlist, isDevelopment: false }),
    ).toBe(true)
    expect(
      isAdminAccessAllowed({ clientIp: "192.168.1.99", allowlist, isDevelopment: false }),
    ).toBe(true)
    expect(
      isAdminAccessAllowed({ clientIp: "8.8.8.8", allowlist, isDevelopment: false }),
    ).toBe(false)
  })
})
