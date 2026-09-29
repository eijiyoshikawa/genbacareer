/**
 * <script type="application/ld+json"> 用の安全なシリアライズ。
 * 求人本文などユーザー入力に "</script>" が含まれても script タグを閉じられないよう
 * "<" と行区切り文字をエスケープする (XSS 対策)。
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(new RegExp("\\u2028", "g"), "\\u2028")
    .replace(new RegExp("\\u2029", "g"), "\\u2029")
}
