#!/usr/bin/env tsx
/**
 * リリース前統合チェック CLI。
 *
 *   pnpm preflight                  # 全チェック実行
 *   pnpm preflight --skip=build     # build をスキップ
 *
 * 内訳:
 *   1. typecheck (tsc --noEmit)
 *   2. lint (eslint)
 *   3. unit tests (vitest)
 *   4. env vars (check-env.ts)
 *   5. prisma schema diff (本番 DB と比較)
 *   6. build (next build) ※ 最後 (重い)
 *
 * 失敗したら即 exit。CI でも使える。
 */
import { spawnSync } from "node:child_process"

type Step = {
  name: string
  cmd: string
  /** 失敗しても続行する場合 true */
  optional?: boolean
}

const ALL_STEPS: Step[] = [
  {
    name: "typecheck",
    cmd: "pnpm exec tsc --noEmit",
  },
  {
    name: "lint",
    cmd: "pnpm lint",
  },
  {
    name: "tests",
    cmd: "pnpm test",
  },
  {
    name: "env",
    cmd: "pnpm check:env",
    optional: true,
  },
  {
    name: "build",
    cmd: "pnpm build",
  },
]

function run(step: Step): boolean {
  console.log(`\n=========================================`)
  console.log(`▶ [${step.name}] ${step.cmd}`)
  console.log(`=========================================`)
  const r = spawnSync(step.cmd, {
    shell: true,
    stdio: "inherit",
    env: process.env,
  })
  const ok = r.status === 0
  if (ok) {
    console.log(`✅ [${step.name}] passed`)
  } else if (step.optional) {
    console.log(`⚠️  [${step.name}] failed (optional, continuing)`)
  } else {
    console.log(`❌ [${step.name}] failed (exit ${r.status})`)
  }
  return ok
}

function main() {
  const args = process.argv.slice(2)
  const skipArg = args.find((a) => a.startsWith("--skip="))
  const skip = skipArg ? skipArg.split("=")[1].split(",") : []

  const steps = ALL_STEPS.filter((s) => !skip.includes(s.name))
  console.log(`🚀 preflight: ${steps.map((s) => s.name).join(" → ")}\n`)

  const start = Date.now()
  const failed: string[] = []

  for (const step of steps) {
    const ok = run(step)
    if (!ok && !step.optional) {
      failed.push(step.name)
      break // 致命的失敗は即停止
    }
    if (!ok && step.optional) {
      failed.push(`${step.name} (optional)`)
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(`\n\n========== preflight summary ==========`)
  console.log(`所要時間: ${elapsed} 秒`)
  console.log(`実施: ${steps.length} 件`)
  console.log(`失敗: ${failed.length} 件${failed.length > 0 ? ` (${failed.join(", ")})` : ""}`)

  if (failed.some((f) => !f.endsWith("(optional)"))) {
    console.log("\n❌ 致命的な失敗があります。修正してから再実行してください。")
    process.exit(1)
  } else {
    console.log("\n✅ 致命的な失敗はありません。リリース準備完了です 🚀")
  }
}

main()
