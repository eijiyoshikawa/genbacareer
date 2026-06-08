/**
 * src/lib/article-images.ts
 *
 * マガジン記事への画像差し込み（ヒーロー差し替え + 本文2枚）の純粋ロジック。
 *
 * - assignImages: 画像プールから記事ごとに hero + 本文2枚をローテーション割当
 * - insertImagesIntoBody: 本文HTMLの適切な位置に <figure><img> を2枚挿入
 * - hasAutoImages: 既に自動挿入済みか（冪等性: 二重挿入を防ぐ）
 *
 * DB / ストレージ I/O は scripts 側。ここは入出力が決定的な純関数のみ。
 */

/** 記事1件に割り当てる画像URL一式。 */
export type AssignedImages = {
  hero: string
  body: [string, string]
}

/**
 * 画像プールを記事へローテーション割当する。
 * 記事 i には pool[3i], pool[3i+1], pool[3i+2]（mod N）を割り当て、
 * プール全体を満遍なく使い、同一記事内の3枚はできるだけ重複しないようにする。
 *
 * @param articleIds 記事ID（呼び出し側で安定ソート済みであること）
 * @param pool 画像URL（1枚以上）
 */
export function assignImages(
  articleIds: string[],
  pool: string[]
): Map<string, AssignedImages> {
  const n = pool.length
  const result = new Map<string, AssignedImages>()
  if (n === 0) return result
  articleIds.forEach((id, i) => {
    const base = i * 3
    result.set(id, {
      hero: pool[base % n],
      body: [pool[(base + 1) % n], pool[(base + 2) % n]],
    })
  })
  return result
}

/** HTML 属性値用エスケープ。 */
export function escapeHtmlAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** 自動挿入の目印（冪等判定 / 後からの一括除去に使う）。 */
export const AUTO_IMAGE_MARKER = "data-auto-img"

/** 本文が既に自動挿入済みかどうか。 */
export function hasAutoImages(body: string): boolean {
  return body.includes(AUTO_IMAGE_MARKER)
}

/** 1枚分の figure HTML を生成。 */
export function buildImageFigure(url: string, alt: string): string {
  const u = escapeHtmlAttr(url)
  const a = escapeHtmlAttr(alt)
  return `<figure class="article-auto-image" ${AUTO_IMAGE_MARKER}="1"><img src="${u}" alt="${a}" loading="lazy" style="max-width:100%;height:auto" /></figure>`
}

/**
 * 本文HTMLに画像2枚を挿入する。
 *  - 段落 </p> 区切りを基準に、1枚目を最初の段落直後、2枚目を中盤に挿入
 *  - 段落が無い本文は末尾にまとめて2枚追加
 *  - 既に自動挿入済み（マーカーあり）なら何もしない（冪等）
 */
export function insertImagesIntoBody(
  body: string,
  images: Array<{ url: string; alt: string }>
): string {
  if (images.length === 0) return body
  if (hasAutoImages(body)) return body // 冪等: 二重挿入しない

  const figs = images.map((im) => buildImageFigure(im.url, im.alt))

  const segments = body.split("</p>")
  const closeCount = segments.length - 1 // </p> の数 = 段落数

  if (closeCount === 0) {
    // 段落が無い → 末尾にまとめて追加
    return body + "\n" + figs.join("\n")
  }

  // 挿入位置（段落インデックス: 0 = 最初の段落直後）
  const pos1 = 0
  const pos2 = Math.max(1, Math.floor(closeCount / 2))
  // 位置 → その直後に挿入する figure 群（pos が同じになる短い記事も考慮）
  const byPos = new Map<number, string[]>()
  const pushAt = (pos: number, fig: string) => {
    const arr = byPos.get(pos) ?? []
    arr.push(fig)
    byPos.set(pos, arr)
  }
  pushAt(pos1, figs[0])
  if (figs[1]) pushAt(Math.min(pos2, closeCount - 1), figs[1])

  let out = ""
  for (let i = 0; i < segments.length; i++) {
    out += segments[i]
    if (i < closeCount) {
      out += "</p>"
      const inserts = byPos.get(i)
      if (inserts) out += "\n" + inserts.join("\n")
    }
  }
  return out
}
