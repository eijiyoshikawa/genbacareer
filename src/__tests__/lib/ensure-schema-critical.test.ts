import { readFileSync } from "fs"
import { resolve } from "path"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ prisma: {} }))
import { buildCriticalColumnsDdl } from "@/lib/ensure-schema"

// User / CompanyUser は認証時に全カラムが暗黙 select されるため、
// 後付けカラムが本番 DB に無いとログイン・登録が P2022 で全停止する。
// schema.prisma の @map カラムがすべて自己修復対象に入っていることを保証する。
function mappedColumns(model: string): string[] {
  const schema = readFileSync(resolve(__dirname, "../../../prisma/schema.prisma"), "utf8")
  const m = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`))
  if (!m) throw new Error(`model ${model} not found`)
  return [...m[1].matchAll(/@map\("([a-z_]+)"\)/g)].map((x) => x[1])
}

// 初期スキーマから存在する列（自己修復の対象外）
const BASELINE = new Set([
  "password_hash", "birth_date", "desired_categories", "desired_salary_min",
  "resume_url", "profile_public", "auth_provider", "created_at", "updated_at",
  "company_id",
])

describe("ensureSchema CRITICAL columns", () => {
  const ddl = buildCriticalColumnsDdl()

  it.each(["User", "CompanyUser"])("%s の後付けカラムをすべて含む", (model) => {
    const missing = mappedColumns(model).filter(
      (c) => !BASELINE.has(c) && !ddl.includes(`'${c}'`)
    )
    expect(missing).toEqual([])
  })

  it("本番で P2022 を起こした列を含む", () => {
    expect(ddl).toContain("'point_balance'")
    expect(ddl).toContain("'avatar_url'")
    expect(ddl).toContain("'issued_login_password'")
  })
})
