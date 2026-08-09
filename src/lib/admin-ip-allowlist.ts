/**
 * /admin/* への IP allowlist 制御。
 *
 * `ADMIN_IP_ALLOWLIST` 環境変数で許可 IP / CIDR (カンマ区切り) を指定する。
 * 未設定 / 空の場合は制限なし (後方互換: 本番投入前は無効化のまま運用可能)。
 *
 * 例:
 *   ADMIN_IP_ALLOWLIST="203.0.113.10,198.51.100.0/24,2001:db8::/32"
 *
 * - IPv4 / IPv6 / CIDR 表記対応 (CIDR は単純なプレフィックスマッチ)
 * - 開発環境 (NODE_ENV !== "production") では loopback (127.0.0.1, ::1) を常に許可
 * - Vercel 経由の場合 `x-forwarded-for` 先頭がクライアント IP
 */

const LOOPBACK_IPS = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"])

export function parseAllowlist(envValue: string | undefined): string[] {
  if (!envValue) return []
  return envValue
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * リクエストヘッダからクライアント IP を抽出する。
 * Vercel は `x-forwarded-for` をセットする。先頭 (左端) が元クライアント。
 */
export function extractClientIp(headers: {
  get(name: string): string | null
}): string | null {
  const xff = headers.get("x-forwarded-for")
  if (xff) {
    const first = xff.split(",")[0]?.trim()
    if (first) return first
  }
  const xri = headers.get("x-real-ip")
  if (xri) return xri.trim()
  return null
}

/** IPv4 文字列を 32-bit 整数に変換。失敗時は null。 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split(".")
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const v = Number(p)
    if (!Number.isInteger(v) || v < 0 || v > 255) return null
    n = (n << 8) + v
  }
  // 32-bit unsigned に正規化 (左シフトで符号付きになる)
  return n >>> 0
}

/** IPv4 CIDR マッチ (例: "10.0.0.0/8") */
function ipv4MatchesCidr(ip: string, cidr: string): boolean {
  const [base, maskStr] = cidr.split("/")
  if (!base || !maskStr) return false
  const mask = Number(maskStr)
  if (!Number.isInteger(mask) || mask < 0 || mask > 32) return false
  const ipInt = ipv4ToInt(ip)
  const baseInt = ipv4ToInt(base)
  if (ipInt === null || baseInt === null) return false
  if (mask === 0) return true
  const maskBits = (~0 << (32 - mask)) >>> 0
  return (ipInt & maskBits) === (baseInt & maskBits)
}

/** IPv6 文字列 (省略記法 "::" 対応) を 128-bit BigInt に変換。失敗時は null。 */
function ipv6ToBigInt(ip: string): bigint | null {
  const addr = ip.split("%")[0] // zone index (fe80::1%eth0) を除去
  if (!addr) return null

  const expandGroups = (parts: string[]): number[] | null => {
    const groups: number[] = []
    for (const part of parts) {
      if (part.includes(".")) {
        // 末尾の IPv4-mapped 表記 (例: ::ffff:127.0.0.1)
        const v4 = ipv4ToInt(part)
        if (v4 === null) return null
        groups.push((v4 >>> 16) & 0xffff, v4 & 0xffff)
      } else {
        if (part === "" || !/^[0-9a-fA-F]{1,4}$/.test(part)) return null
        groups.push(parseInt(part, 16))
      }
    }
    return groups
  }

  const doubleColonIndex = addr.indexOf("::")
  let fullGroups: number[]
  if (doubleColonIndex !== -1) {
    if (addr.indexOf("::", doubleColonIndex + 1) !== -1) return null // "::" は 1 回のみ
    const head = addr.slice(0, doubleColonIndex)
    const tail = addr.slice(doubleColonIndex + 2)
    const headGroups = expandGroups(head ? head.split(":") : [])
    const tailGroups = expandGroups(tail ? tail.split(":") : [])
    if (headGroups === null || tailGroups === null) return null
    const missing = 8 - headGroups.length - tailGroups.length
    if (missing < 0) return null
    fullGroups = [...headGroups, ...Array(missing).fill(0), ...tailGroups]
  } else {
    const groups = expandGroups(addr.split(":"))
    if (groups === null) return null
    fullGroups = groups
  }
  if (fullGroups.length !== 8) return null

  let result = BigInt(0)
  for (const g of fullGroups) {
    result = (result << BigInt(16)) | BigInt(g)
  }
  return result
}

/** IPv6 CIDR マッチ (例: "2001:db8::/32")。プレフィックス長をビット単位で正しく比較する。 */
function ipv6MatchesCidr(ip: string, cidr: string): boolean {
  const [base, maskStr] = cidr.split("/")
  if (!base || !maskStr) return false
  const mask = Number(maskStr)
  if (!Number.isInteger(mask) || mask < 0 || mask > 128) return false
  const ipBig = ipv6ToBigInt(ip)
  const baseBig = ipv6ToBigInt(base)
  if (ipBig === null || baseBig === null) return false
  const maskBits =
    mask === 0
      ? BigInt(0)
      : ((BigInt(1) << BigInt(mask)) - BigInt(1)) << BigInt(128 - mask)
  return (ipBig & maskBits) === (baseBig & maskBits)
}

/**
 * クライアント IP が allowlist にマッチするか。
 *
 * - 単一 IP: 完全一致
 * - CIDR: IPv4 / IPv6 ともプレフィックス長をビット単位で厳密に比較する
 */
export function ipMatches(clientIp: string, entry: string): boolean {
  if (entry === clientIp) return true
  if (entry.includes("/")) {
    // CIDR。IPv4 は "." のみでコロンを含まない前提で判定。
    if (entry.includes(":")) return ipv6MatchesCidr(clientIp, entry)
    return ipv4MatchesCidr(clientIp, entry)
  }
  return false
}

/**
 * /admin/* へのアクセスが許可されるかを判定する。
 *
 * @returns true なら通す、false ならブロック (403)
 */
export function isAdminAccessAllowed(args: {
  clientIp: string | null
  allowlist: string[]
  isDevelopment: boolean
}): boolean {
  const { clientIp, allowlist, isDevelopment } = args

  // allowlist 未設定 → 制限なし (バックアップ動作)
  if (allowlist.length === 0) return true

  // dev 環境は loopback を常に許可
  if (isDevelopment && clientIp && LOOPBACK_IPS.has(clientIp)) return true

  if (!clientIp) return false

  return allowlist.some((entry) => ipMatches(clientIp, entry))
}
