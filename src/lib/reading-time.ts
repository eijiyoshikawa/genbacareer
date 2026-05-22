/**
 * 記事本文 (Markdown または HTML) から読了時間を推定する。
 *
 * 日本語の読書速度は約 400〜600 字/分。ゲンバキャリアでは中位の
 * **450 字/分** を採用 (現場系の用語が多めに含まれることを想定して
 * やや遅め設定)。
 */

/** 1 分あたりに読める文字数 (日本語想定) */
const CHARS_PER_MINUTE = 450

/**
 * Markdown / HTML 混在の本文から文字数をざっくり数えて
 * 読了時間 (分) を返す。最小値 1 分。
 */
export function estimateReadingMinutes(body: string | null | undefined): number {
  if (!body) return 1
  // HTML タグと Markdown 記号を除去して純テキスト化
  const text = body
    .replace(/<[^>]+>/g, "")
    .replace(/[#*_`>~\-\[\]()!]/g, "")
    .replace(/!?\[[^\]]*\]\([^)]*\)/g, "") // ![alt](src), [text](url)
    .replace(/\s+/g, "")
  const chars = text.length
  const minutes = Math.ceil(chars / CHARS_PER_MINUTE)
  return Math.max(1, minutes)
}
