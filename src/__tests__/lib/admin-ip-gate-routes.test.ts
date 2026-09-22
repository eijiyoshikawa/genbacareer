import { describe, it, expect } from "vitest"

/**
 * middleware.ts の IP allowlist 対象パス判定ロジックを単体テスト。
 *
 * 回帰防止: adminRoutes ("/admin") だけを使うと "/api/admin/*" は
 * pathname.startsWith("/admin") が false になり allowlist が素通りしてしまう
 * バグが過去にあった（IP allowlist が /admin/* ページにしか効かず、実際の
 * 機微な操作が集中する /api/admin/* API には一切適用されていなかった）。
 * middleware.ts の adminIpGateRoutes = ["/admin", "/api/admin"] と同期させること。
 */
const adminIpGateRoutes = ["/admin", "/api/admin"]

function isAdminIpGateRoute(pathname: string): boolean {
  return adminIpGateRoutes.some((r) => pathname.startsWith(r))
}

describe("admin IP allowlist gate route matching", () => {
  it("matches /admin/* page routes", () => {
    expect(isAdminIpGateRoute("/admin")).toBe(true)
    expect(isAdminIpGateRoute("/admin/login")).toBe(true)
    expect(isAdminIpGateRoute("/admin/companies/123")).toBe(true)
  })

  it("matches /api/admin/* API routes", () => {
    expect(isAdminIpGateRoute("/api/admin/users/1")).toBe(true)
    expect(isAdminIpGateRoute("/api/admin/companies/1/approve")).toBe(true)
    expect(isAdminIpGateRoute("/api/admin/segments/broadcast")).toBe(true)
    expect(isAdminIpGateRoute("/api/admin/dedupe/merge")).toBe(true)
  })

  it("does NOT match unrelated public/API routes", () => {
    expect(isAdminIpGateRoute("/jobs")).toBe(false)
    expect(isAdminIpGateRoute("/api/jobs")).toBe(false)
    expect(isAdminIpGateRoute("/api/jobs/123")).toBe(false)
    expect(isAdminIpGateRoute("/company/dashboard")).toBe(false)
    expect(isAdminIpGateRoute("/api/company/applications")).toBe(false)
  })
})
