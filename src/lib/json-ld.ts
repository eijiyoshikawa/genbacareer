/**
 * JSON-LD を <script> 内に埋め込むための安全なシリアライザ。
 * "<" を < にエスケープし、求人本文等に含まれる "</script>" による
 * タグ脱出（XSS）を防ぐ。U+2028/2029 も念のためエスケープする。
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
}
