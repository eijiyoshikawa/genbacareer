// @vitest-environment node
import { describe, it, expect, vi } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

vi.mock("@/lib/db", () => ({ prisma: {} }))
vi.mock("../../lib/db", () => ({ prisma: {} }))

import { __CRITICAL_STATEMENTS_FOR_TEST } from "@/lib/ensure-schema"

/**
 * User model の全カラムが CRITICAL_STATEMENTS (ENSURE_SCHEMA=false でも必ず
 * 実行される自己修復 DDL) に含まれていることを保証する。
 * 1 列でも欠けると prisma.user.findUnique が P2022 で落ち、ログイン・会員登録が
 * 全停止する (avatar_url / point_balance で本番障害の実績あり)。
 */
function userColumns(): string[] {
  const schema = readFileSync(resolve(__dirname, "../../../prisma/schema.prisma"), "utf8")
  const m = schema.match(/^model User \{([\s\S]*?)^\}/m)
  if (!m) throw new Error("model User not found")
  const cols: string[] = []
  for (const raw of m[1].split("\n")) {
    const line = raw.trim()
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue
    const [field, type] = line.split(/\s+/)
    // リレーション (大文字始まりの型 / 配列のモデル) はカラムではない
    const base = type.replace(/[?[\]]/g, "")
    if (!["String", "Int", "Boolean", "DateTime", "Json", "Float", "BigInt", "Decimal"].includes(base)) continue
    const mapped = line.match(/@map\("([^"]+)"\)/)
    cols.push(mapped ? mapped[1] : field)
  }
  return cols
}

describe("ensureSchema CRITICAL_STATEMENTS", () => {
  it("covers every column of the User model", () => {
    const sql = __CRITICAL_STATEMENTS_FOR_TEST.join("\n")
    const missing = userColumns()
      .filter((c) => c !== "id" && c !== "email")
      .filter((c) => !sql.includes(`"${c}"`))
    expect(missing).toEqual([])
  })
})
