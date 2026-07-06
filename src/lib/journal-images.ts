import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"

/**
 * マガジン（journal）記事のカバー写真プール。
 *
 * 写真を持たない求人のフォールバック背景として転用する（求人フィード等）。
 * 記事を追加・差し替えれば自動的にプールも入れ替わる。
 * 取得失敗時は空配列（呼び出し側で静的フォールバックに落とす）。
 */
export async function getMagazineImagePool(limit = 30): Promise<string[]> {
  try {
    const articles = await prisma.article.findMany({
      where: { ...publishedArticleFilter(), imageUrl: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: { imageUrl: true },
    })
    return articles
      .map((a) => a.imageUrl)
      .filter((u): u is string => !!u)
  } catch {
    return []
  }
}

/**
 * key（求人ID等）からプール内の写真を決定的に 1 枚選ぶ。
 * 同じ求人には常に同じ写真が当たる（ページングや再訪で写真が変わらない）。
 */
export function pickPoolImage(pool: string[], key: string): string | null {
  if (pool.length === 0) return null
  let h = 0
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) >>> 0
  }
  return pool[h % pool.length]
}
