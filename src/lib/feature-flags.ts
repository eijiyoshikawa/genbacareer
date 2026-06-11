import { cache } from "react"
import { prisma } from "@/lib/db"

/**
 * 機能フラグ。
 *
 * スカウト機能は「求職者が 1 万人を突破するまで解放しない」方針。
 * 求職者数（User 件数）が閾値以上になると自動的に解放される。
 * 検証用に SCOUT_FORCE_ENABLED=true で強制解放も可能。
 */
export const SCOUT_SEEKER_THRESHOLD = 10000

/** 同一リクエスト内で重複カウントしないよう cache でメモ化 */
export const getSeekerCount = cache(async (): Promise<number> => {
  try {
    return await prisma.user.count()
  } catch {
    return 0
  }
})

/** スカウト機能が解放されているか（求職者 1 万人以上 or 強制フラグ） */
export async function isScoutEnabled(): Promise<boolean> {
  if (process.env.SCOUT_FORCE_ENABLED === "true") return true
  const count = await getSeekerCount()
  return count >= SCOUT_SEEKER_THRESHOLD
}
