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

/** IPv6 文字列を 8 個の 16-bit 値に展開。失敗時は null。 */
function ipv6ToGroups(ip: string): number[] | null {
  let s = ip.toLowerCase()
  const zone = s.indexOf("%")
  if (zone >= 0) s = s.slice(0, zone)
  // 末尾の IPv4 表記 (::ffff:1.2.3.4) を 2 グループに変換
  const lastColon = s.lastIndexOf(":")
  if (lastColon >= 0 && s.slice(lastColon + 1).includes(".")) {
    const v4 = ipv4ToInt(s.slice(lastColon + 1))
    if (v4 === null) return null
    s = `${s.slice(0, lastColon + 1)}${(v4 >>> 16).toString(16)}:${(v4 & 0xffff).toString(16)}`
  }
  const halves = s.split("::")
  if (halves.length > 2) return null
  const parse = (part: string): number[] | null => {
    if (part === "") return []
    const out: number[] = []
    for (const g of part.split(":")) {
      if (!/^[0-9a-f]{1,4}$/.test(g)) return null
      out.push(parseInt(g, 16))
    }
    return out
  }
  const head = parse(halves[0])
  const tail = halves.length === 2 ? parse(halves[1]) : []
  if (!head || !tail) return null
  if (halves.length === 1) return head.length === 8 ? head : null
  const fill = 8 - head.length - tail.length
  if (fill < 1) return null
  return [...head, ...new Array<number>(fill).fill(0), ...tail]
}

/** IPv6 CIDR マッチ (例: "2001:db8::/32") */
function ipv6MatchesCidr(ip: string, cidr: string): boolean {
  const [base, maskStr] = cidr.split("/")
  if (!base || !maskStr) return false
  const mask = Number(maskStr)
  if (!Number.isInteger(mask) || mask < 0 || mask > 128) return false
  const a = ipv6ToGroups(ip)
  const b = ipv6ToGroups(base)
  if (!a || !b) return false
  let remaining = mask
  for (let i = 0; i < 8 && remaining > 0; i++) {
    const bits = Math.min(16, remaining)
    const m = (0xffff << (16 - bits)) & 0xffff
    if ((a[i] & m) !== (b[i] & m)) return false
    remaining -= bits
  }
  return true
}

/**
 * クライアント IP が allowlist にマッチするか。
 *
 * - 単一 IP: 完全一致
 * - CIDR: ipv4MatchesCidr のみサポート (IPv6 CIDR もビット単位でマッチ)
 */
export function ipMatches(clientIp: string, entry: string): boolean {
  if (entry === clientIp) return true
  if (entry.includes("/")) {
    // CIDR
    if (entry.includes(".")) return ipv4MatchesCidr(clientIp, entry)
    return ipv6MatchesCidr(clientIp, entry)
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
