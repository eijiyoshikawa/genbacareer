/**
 * リクエストヘッダから「信頼できる」クライアント IP を抽出する共通ヘルパー。
 *
 * IP allowlist (admin) やレート制限、ログイン試行制限など、セキュリティ判定に
 * 使う IP は spoofing 耐性が必須。素朴に `x-forwarded-for` の先頭値を使うと、
 * Vercel の手前に別の CDN / プロキシが挟まる構成 (WAF, Cloudflare 等) では
 * クライアントが送った偽の値がそのまま先頭に残り得るため、それを信頼してしまう。
 *
 * 優先順位:
 *   1. x-vercel-forwarded-for — Vercel が付与する非偽装ヘッダ (あれば最優先)
 *   2. x-forwarded-for — 末尾 (直前ホップが付与した値) を信頼する。
 *      標準的な XFF の作法では各プロキシが「自分に接続してきた相手」の IP を
 *      末尾に追記していくため、最も信頼できるのは最後の値。
 *   3. x-real-ip — nginx 等のリバースプロキシが付与する単一値ヘッダ
 *
 * Vercel は自前のエッジのみを経由する構成では x-forwarded-for を上書きして
 * クライアントの偽装値を除去するが、CDN 等が前段にある場合はこの限りではない
 * ため、上記の優先順位で防御的に扱う。
 */
export function extractClientIp(headers: {
  get(name: string): string | null
}): string | null {
  const vercelXff = headers.get("x-vercel-forwarded-for")
  if (vercelXff) {
    const first = vercelXff.split(",")[0]?.trim()
    if (first) return first
  }

  const xff = headers.get("x-forwarded-for")
  if (xff) {
    const parts = xff.split(",").map((s) => s.trim()).filter(Boolean)
    if (parts.length > 0) return parts[parts.length - 1]
  }

  const xri = headers.get("x-real-ip")
  if (xri) return xri.trim()

  return null
}
