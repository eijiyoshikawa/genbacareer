import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import {
  extractClientIp,
  isAdminAccessAllowed,
  parseAllowlist,
} from "@/lib/admin-ip-allowlist"

const SESSION_COOKIE_NAME = "gc_sid"
const SESSION_MAX_AGE = 365 * 24 * 60 * 60

/**
 * スクレイピング防止: 明らかにブラウザを偽装していない UA を 403 で弾く。
 *
 * 通常のブラウザは "Mozilla/" で始まるため、それ以外の主要なデータ収集ツール
 * (curl, wget, python-requests, axios, Go-http-client, java HttpURLConnection など)
 * は名前で判定して拒否する。
 *
 * Googlebot や Bingbot の正規 SE クローラはこのリストに含めない（公式 UA が
 * "Mozilla/5.0 (compatible; Googlebot/2.1; ...)" のように Mozilla プレフィクスを
 * 持つため通過する）。
 *
 * AI 学習系クローラ（GPTBot 等）は robots.txt で disallow + ここでも UA 名で拒否。
 */
const BLOCKED_UA_PATTERNS: ReadonlyArray<RegExp> = [
  // 開発者ツール / スクリプト系（典型的なスクレイピングツール）
  /\bcurl\//i,
  /\bwget\//i,
  /\bpython-requests\b/i,
  /\bpython-urllib\b/i,
  /\bGo-http-client\b/i,
  /\baxios\/(?!.*Mozilla)/i,
  /\bnode-fetch\b/i,
  /\bokhttp\b/i,
  /\bRESTSharp\b/i,
  /\bJava\/[\d.]+$/i,
  /\bRuby\b/i,
  /\bphp\/[\d.]+\b/i,
  /\bScrapy\b/i,
  /\bcolly\b/i,
  // ヘッドレス / 自動化ツール
  /\bHeadlessChrome\b/i,
  /\bPhantomJS\b/i,
  /\bSlimerJS\b/i,
  /\bElectron\b/i,
  // AI 学習・データ収集ボット（robots.txt と重複でも UA レベルでブロック）
  /\bGPTBot\b/i,
  /\bChatGPT-User\b/i,
  /\bClaudeBot\b/i,
  /\banthropic-ai\b/i,
  /\bPerplexityBot\b/i,
  /\bCCBot\b/i,
  /\bBytespider\b/i,
  /\bDataForSeoBot\b/i,
  /\bAhrefsBot\b/i,
  /\bSemrushBot\b/i,
  /\bMJ12bot\b/i,
  /\bDotBot\b/i,
  /\bPetalBot\b/i,
]

/** UA がブロック対象かどうか */
function isBlockedUA(ua: string | null): boolean {
  if (!ua) return true // UA なしも怪しいので拒否
  return BLOCKED_UA_PATTERNS.some((p) => p.test(ua))
}

/** UUID v4 を crypto から生成（Edge Runtime 互換） */
function generateSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  // フォールバック（Edge ランタイムでは到達しない想定）
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256)
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

// 本番として公開する正規ホスト名。これ以外で本番デプロイへ到達した場合は
// SEO 統合のため 301 で集約する。プレビュー / ブランチデプロイはこの集合に
// 含めない（VERCEL_ENV !== "production" の場合は noindex のみ）。
const CANONICAL_HOSTS = new Set(["genbacareer.jp", "www.genbacareer.jp"])

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const host = (request.headers.get("host") ?? "").toLowerCase()

  // ============================================================
  // 0a) Canonical host へのリダイレクト
  //     本番デプロイは genbacareer.jp / www.genbacareer.jp のみで配信したい。
  //     let-kyujin.vercel.app などへ到達したアクセスは 301 で本番ドメインへ。
  //     プレビュー (VERCEL_ENV=preview) は QA 用にアクセス可能にする代わり
  //     後段の withTrackingCookie で noindex ヘッダを必ず付ける。
  // ============================================================
  const isVercelHost = host.endsWith(".vercel.app")
  // /api/cron/* と /api/webhooks/* は Vercel Cron / 外部 Webhook が deployment URL
  // を直接叩く。canonical へ 301 すると Authorization ヘッダが落ちて認証失敗するため
  // ホスト書き換えからは除外する（後段の noindex は引き続き付与）。
  const isInfraEndpoint =
    pathname.startsWith("/api/cron") || pathname.startsWith("/api/webhooks")
  // 本番の正規ホストは www.genbacareer.jp に集約する。
  //   - *.vercel.app（ブランチ/プレビュー以外で本番到達したもの）→ www
  //   - apex genbacareer.jp → www（www/非www の重複・redirect_uri 不一致を解消）
  const isApexHost = host === "genbacareer.jp"
  if (
    process.env.VERCEL_ENV === "production" &&
    !isInfraEndpoint &&
    ((isVercelHost && !CANONICAL_HOSTS.has(host)) || isApexHost)
  ) {
    const canonicalUrl = new URL(request.nextUrl)
    canonicalUrl.host = "www.genbacareer.jp"
    canonicalUrl.protocol = "https:"
    canonicalUrl.port = ""
    return NextResponse.redirect(canonicalUrl, 301)
  }

  // ============================================================
  // 0) スクレイピング防止: 公開コンテンツに対する明らかな bot UA を 403。
  //    Googlebot 等の正規 SE は "Mozilla/" で始まるため通過する。
  //    認証エリア (/mypage 等) や API は別系統で守られているのでここでは
  //    公開ページのみガード（/jobs, /companies, /journal, /, /[prefecture] 等）。
  // ============================================================
  const ua = request.headers.get("user-agent")
  // LINE webhook 等の外部 webhook は自前 UA なので /api/webhooks は除外。
  // /api/cron も Bearer 認証で守られているので除外。
  const isExempt =
    pathname.startsWith("/api/webhooks") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/auth")
  if (!isExempt && isBlockedUA(ua)) {
    return new NextResponse("Forbidden", {
      status: 403,
      headers: {
        "X-Robots-Tag": "noindex, nofollow",
        "Cache-Control": "no-store",
      },
    })
  }

  // ============================================================
  // 1) 匿名トラッキング: gc_sid cookie 発行（未発行ユーザーのみ）
  //    閲覧 / クリック / lead を sessionId で串刺し集計するため。
  //    Server Component 側からは Cookie set できないので middleware で発行。
  // ============================================================
  let trackingSetCookie: { name: string; value: string } | null = null
  const existingSid = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!existingSid || !/^[a-f0-9-]{36}$/i.test(existingSid)) {
    const fresh = generateSessionId()
    // 同一リクエスト内で server component から読めるよう request にもセット
    request.cookies.set(SESSION_COOKIE_NAME, fresh)
    trackingSetCookie = { name: SESSION_COOKIE_NAME, value: fresh }
  }

  // Check for session token (NextAuth stores JWT in this cookie)
  const token =
    request.cookies.get("authjs.session-token")?.value ??
    request.cookies.get("__Secure-authjs.session-token")?.value

  const isLoggedIn = !!token

  // 保護されたルート
  const seekerRoutes = ["/mypage"]
  const companyRoutes = [
    "/company/dashboard",
    "/company/jobs",
    "/company/applications",
    "/company/billing",
    "/company/candidates",
  ]
  const adminRoutes = ["/admin"]
  const adminApiRoutes = ["/api/admin"]

  const isSeekerRoute = seekerRoutes.some((r) => pathname.startsWith(r))
  const isCompanyRoute = companyRoutes.some((r) => pathname.startsWith(r))
  const isAdminRoute =
    adminRoutes.some((r) => pathname.startsWith(r)) && pathname !== "/admin/login"
  // /admin/* のページに加え /api/admin/* も allowlist 対象にする。
  // (API ルートはページ側と別系統で守られるため isAdminRoute には含めない)
  const isAdminAnyRoute =
    adminRoutes.some((r) => pathname.startsWith(r)) ||
    adminApiRoutes.some((r) => pathname.startsWith(r))

  // /admin/* と /api/admin/* への IP allowlist 制御。ADMIN_IP_ALLOWLIST 未設定なら無制限。
  // 設定済みなら /admin/login 含めて全 /admin, /api/admin パスに適用 (ブルートフォース防御も兼ねる)。
  if (isAdminAnyRoute) {
    const allowlist = parseAllowlist(process.env.ADMIN_IP_ALLOWLIST)
    if (allowlist.length > 0) {
      const clientIp = extractClientIp(request.headers)
      const ok = isAdminAccessAllowed({
        clientIp,
        allowlist,
        isDevelopment: process.env.NODE_ENV !== "production",
      })
      if (!ok) {
        return new NextResponse("Forbidden", {
          status: 403,
          headers: {
            "X-Robots-Tag": "noindex, nofollow",
            "Cache-Control": "no-store",
          },
        })
      }
    }
  }

  /** すべての応答に gc_sid Cookie + 必要なら noindex ヘッダを乗せるヘルパー。 */
  function withTrackingCookie(res: NextResponse): NextResponse {
    if (trackingSetCookie) {
      res.cookies.set({
        name: trackingSetCookie.name,
        value: trackingSetCookie.value,
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: SESSION_MAX_AGE,
      })
    }
    // 認証必須エリア / プレビュー / API / *.vercel.app は検索エンジンインデックス対象外。
    // <meta name="robots"> より速く確実なので CDN レベルで X-Robots-Tag を出す。
    if (
      isVercelHost ||
      pathname.startsWith("/mypage") ||
      pathname.startsWith("/company") ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/api/") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/signup") ||
      pathname.startsWith("/liff") ||
      pathname.includes("/preview/")
    ) {
      res.headers.set("X-Robots-Tag", "noindex, nofollow")
    } else {
      // 公開ページ: Google にはインデックスさせるが、
      // Wayback Machine / Common Crawl / アーカイブ系には保存させない
      // (noarchive)。スニペット長も制限してデータ流出を抑制。
      res.headers.set(
        "X-Robots-Tag",
        "index, follow, noarchive, max-snippet:160"
      )
    }
    return res
  }

  // Redirect unauthenticated users to login
  if ((isSeekerRoute || isCompanyRoute || isAdminRoute) && !isLoggedIn) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", pathname)
    return withTrackingCookie(NextResponse.redirect(loginUrl))
  }

  // Role-based access control via JWT payload
  // NextAuth v5 JWT is base64-encoded JSON with a "role" claim
  if (isLoggedIn && token) {
    const role = decodeRoleFromJwt(token)

    if (isCompanyRoute && role && role !== "company_admin" && role !== "company_member") {
      return withTrackingCookie(NextResponse.redirect(new URL("/mypage", request.url)))
    }

    if (isAdminRoute && role && role !== "admin") {
      return withTrackingCookie(NextResponse.redirect(new URL("/", request.url)))
    }

    if (isSeekerRoute && role && (role === "company_admin" || role === "company_member")) {
      return withTrackingCookie(NextResponse.redirect(new URL("/company/dashboard", request.url)))
    }
  }

  return withTrackingCookie(NextResponse.next())
}

/**
 * NextAuth v5 JWTからroleクレームを抽出する。
 * JWTは暗号化(JWE)されているため、Edge Runtimeでは完全にデコードできない場合がある。
 * その場合はnullを返し、ページ/APIレベルでの検証にフォールバックする。
 */
function decodeRoleFromJwt(token: string): string | null {
  try {
    // NextAuth v5 uses encrypted JWE tokens by default.
    // Try to extract payload from unencrypted JWT (3-part dot-separated).
    const parts = token.split(".")
    if (parts.length === 3) {
      const payload = JSON.parse(atob(parts[1]))
      return payload.role ?? null
    }
    // Encrypted JWE token — cannot decode in middleware without the secret.
    // Fall back to page/API-level role checks.
    return null
  } catch {
    return null
  }
}

export const config = {
  // 認証チェック対象に加え、トラッキング Cookie 発行のため公開ページもマッチ。
  // _next/* / favicon / icon / api/auth / 静的ファイルは除外（静的アセットには Cookie 不要）。
  matcher: [
    "/((?!_next/|favicon|icon|apple-icon|opengraph-image|robots|sitemap|api/auth|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js)$).*)",
  ],
}
