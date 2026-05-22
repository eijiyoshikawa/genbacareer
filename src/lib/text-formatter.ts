/**
 * ハローワーク等から取得したフリーテキストを読みやすく整形するヘルパー。
 *
 * - 連続改行（3 つ以上）→ 段落区切りに圧縮
 * - 行頭の全角スペースの擬似インデント除去
 * - 「・」「●」「■」「○」「-」「※」始まりの行を箇条書きとして検出
 * - 「※」始まりは注記としてマーキング
 * - 段落・箇条書き・注記の Block 配列に変換し、UI 側で構造的にレンダリング
 */

export type FormattedBlock =
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "note"; text: string }

const BULLET_PREFIX = /^[・●○◯◆■\-*]\s*/
const NOTE_PREFIX = /^[※*]\s*/
const HEADING_LINE = /^[（(]?[【〔■◆][^】〕\n]{1,30}[】〕]?\s*$/

/**
 * テキストを正規化する。
 *
 * - CRLF → LF
 * - 行頭・行末の全角スペースを除去
 * - 連続スペース (半角/全角) を 1 個に圧縮
 * - 連続改行 (3+) を 2 改行に圧縮
 */
export function normalizeText(raw: string): string {
  if (!raw) return ""
  return raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^[\s　]+|[\s　]+$/g, ""))
    .join("\n")
    .replace(/[ 　]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/**
 * テキストを段落・箇条書き・注記の Block 配列に変換する。
 * 元テキストの構造をできる限り保ちつつ、UI 側で構造的に表示可能にする。
 */
export function formatText(raw: string | null | undefined): FormattedBlock[] {
  const text = normalizeText(raw ?? "")
  if (!text) return []

  const blocks: FormattedBlock[] = []
  // 段落（空行）で分割
  const paragraphs = text.split(/\n{2,}/)

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n").filter((l) => l.length > 0)
    if (lines.length === 0) continue

    let currentList: string[] = []
    const flushList = () => {
      if (currentList.length > 0) {
        blocks.push({ type: "list", items: currentList })
        currentList = []
      }
    }

    const buffer: string[] = []
    const flushBuffer = () => {
      if (buffer.length > 0) {
        blocks.push({ type: "paragraph", text: buffer.join("\n") })
        buffer.length = 0
      }
    }

    for (const line of lines) {
      // 見出し風単独行は無視（前後に文脈が無いとノイズになるため）し、段落区切りとして扱う
      if (HEADING_LINE.test(line)) {
        flushList()
        flushBuffer()
        // 見出し行自体は body 内では扱わない（呼び出し側でセクション分割済み）
        continue
      }
      if (BULLET_PREFIX.test(line)) {
        flushBuffer()
        currentList.push(line.replace(BULLET_PREFIX, "").trim())
        continue
      }
      if (NOTE_PREFIX.test(line)) {
        flushList()
        flushBuffer()
        blocks.push({
          type: "note",
          text: line.replace(NOTE_PREFIX, "").trim(),
        })
        continue
      }
      flushList()
      buffer.push(line)
    }
    flushList()
    flushBuffer()
  }

  return blocks
}
