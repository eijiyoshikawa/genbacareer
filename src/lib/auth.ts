import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import type { Provider } from "next-auth/providers"
import { compare } from "bcryptjs"
import { prisma } from "./db"
import { checkRateLimit } from "./rate-limit"

/**
 * ログイン試行レート制限。
 *
 * 同一 IP から 15 分間に 10 回失敗するとそれ以上の試行を拒否。
 * 連続失敗の brute force / credential stuffing を抑止する。
 *
 * NextAuth v5 では authorize の第 2 引数で Request を受け取れる。
 * x-forwarded-for ヘッダから IP を抽出して使用。
 */
function getIpFromRequest(req: Request | undefined): string {
  if (!req) return "unknown"
  const fwd = req.headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0].trim()
  const real = req.headers.get("x-real-ip")
  return real ?? "unknown"
}

/**
 * 認証 rate-limit を確認。引っかかると Error を throw して NextAuth に
 * "RATE_LIMITED" として返す。
 */
function assertAuthRateLimit(req: Request | undefined, scope: string) {
  const ip = getIpFromRequest(req)
  const rl = checkRateLimit({
    key: `auth:${scope}:${ip}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.allowed) {
    throw new Error("RATE_LIMITED")
  }
}

// Build providers list dynamically based on available env vars
const providers: Provider[] = []

// Google OAuth (optional)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  )
}

// LINE Login (optional) — uses generic OAuth provider
if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) {
  providers.push({
    id: "line",
    name: "LINE",
    type: "oidc",
    issuer: "https://access.line.me",
    clientId: process.env.LINE_CLIENT_ID,
    clientSecret: process.env.LINE_CLIENT_SECRET,
    authorization: {
      params: { scope: "profile openid email" },
    },
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      }
    },
  })
}

// Admin credentials
// ENV (ADMIN_EMAIL/ADMIN_PASSWORD_HASH) と DB の AdminUser 両方を照合。
// ENV が無くても DB に管理者がいれば provider は有効。
providers.push(
  Credentials({
    id: "admin-credentials",
    name: "管理者ログイン",
    credentials: {
      email: { label: "メールアドレス", type: "email" },
      password: { label: "パスワード", type: "password" },
    },
    async authorize(credentials, req) {
      assertAuthRateLimit(req, "admin")
      if (!credentials?.email || !credentials?.password) return null

      const email = String(credentials.email).trim().toLowerCase()
      const password = String(credentials.password)

      // 1) ENV ベース（オーナー固定）
      if (
        process.env.ADMIN_EMAIL &&
        process.env.ADMIN_PASSWORD_HASH &&
        email === process.env.ADMIN_EMAIL.trim().toLowerCase()
      ) {
        const ok = await compare(password, process.env.ADMIN_PASSWORD_HASH)
        if (ok) {
          return {
            id: "admin",
            email: process.env.ADMIN_EMAIL,
            name: "管理者",
            role: "admin" as const,
          }
        }
      }

      // 2) DB ベース（追加された管理者）
      try {
        const admin = await prisma.adminUser.findUnique({
          where: { email },
        })
        if (admin && admin.isActive) {
          const ok = await compare(password, admin.passwordHash)
          if (ok) {
            // last login 更新（失敗しても認証は通す）
            prisma.adminUser
              .update({
                where: { id: admin.id },
                data: { lastLoginAt: new Date() },
              })
              .catch(() => undefined)
            return {
              id: admin.id,
              email: admin.email,
              name: admin.name ?? "管理者",
              role: "admin" as const,
            }
          }
        }
      } catch {
        // AdminUser テーブル未マイグレーション時などはスキップ
      }

      return null
    },
  })
)

// Credential providers (always available)
providers.push(
  Credentials({
      id: "seeker-credentials",
      name: "求職者ログイン",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials, req) {
        assertAuthRateLimit(req, "seeker")
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash) return null

        // 凍結 / 退会済アカウントはログイン拒否
        if (user.status === "suspended") {
          throw new Error("ACCOUNT_SUSPENDED")
        }
        if (user.status === "deleted") {
          throw new Error("ACCOUNT_DELETED")
        }

        const isValid = await compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: "seeker" as const,
        }
      },
    }),
    Credentials({
      id: "company-credentials",
      name: "企業ログイン",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
        totp: { label: "認証コード", type: "text" },
      },
      async authorize(credentials, req) {
        assertAuthRateLimit(req, "company")
        if (!credentials?.email || !credentials?.password) return null

        const companyUser = await prisma.companyUser.findUnique({
          where: { email: credentials.email as string },
          include: { company: true },
        })

        if (!companyUser) return null

        const isValid = await compare(
          credentials.password as string,
          companyUser.passwordHash
        )
        if (!isValid) return null

        // TOTP 2FA: 有効化済みなら 6 桁コード or リカバリコードを必須化
        if (companyUser.totpEnabled && companyUser.totpSecret) {
          const code = (credentials.totp as string | undefined)?.trim()
          if (!code) {
            // フロント側で 2 段目フォームを表示するためのシグナル
            throw new Error("TOTP_REQUIRED")
          }
          const { verifyTotp, consumeRecoveryCode } = await import("@/lib/totp")
          const ok = verifyTotp(code, companyUser.totpSecret)
          if (!ok) {
            // リカバリコードで救済
            const consumed = await consumeRecoveryCode(
              code,
              companyUser.totpRecoveryCodes
            )
            if (!consumed) {
              throw new Error("TOTP_INVALID")
            }
            await prisma.companyUser
              .update({
                where: { id: companyUser.id },
                data: { totpRecoveryCodes: consumed.remaining },
              })
              .catch(() => {})
          }
        }

        return {
          id: companyUser.id,
          email: companyUser.email,
          name: companyUser.name,
          role: companyUser.role === "admin" ? "company_admin" : "company_member",
          companyId: companyUser.companyId,
          mustChangePassword: companyUser.mustChangePassword,
        }
      },
    }),
)

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers,
  session: {
    strategy: "jwt",
  },
  callbacks: {
    /**
     * Open Redirect 防御。NextAuth デフォルトでもある程度は弾くが、
     * callbackUrl=//evil.com 形式や user:pass@example.com 形式の悪用を
     * 明示的に拒否し、ホスト一致しない URL は baseUrl にフォールバック。
     */
    async redirect({ url, baseUrl }) {
      try {
        // 相対パス（ / で始まり // ではない）は内部遷移として許可
        if (url.startsWith("/") && !url.startsWith("//")) {
          return `${baseUrl}${url}`
        }
        // 絶対 URL は baseUrl と origin が一致するときのみ許可
        const target = new URL(url)
        const base = new URL(baseUrl)
        if (target.origin === base.origin) {
          return target.toString()
        }
        // 上記以外（外部 URL / 不正形式）は baseUrl へフォールバック
        return baseUrl
      } catch {
        return baseUrl
      }
    },
    async signIn({ user, account }) {
      // Auto-create user record for OAuth sign-ins
      if (
        account?.provider &&
        account.provider !== "seeker-credentials" &&
        account.provider !== "company-credentials" &&
        account.provider !== "admin-credentials"
      ) {
        if (user.email) {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, emailVerified: true },
          })
          if (!existing) {
            // OAuth プロバイダ経由のメールは確認済みとみなす（Google/LINE が検証済みのため）
            const created = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name ?? null,
                authProvider: account.provider,
                emailVerified: new Date(),
              },
            })
            user.id = created.id
            ;(user as { role?: string }).role = "seeker"
          } else {
            // 既存ユーザーが OAuth で初めてログインした場合も emailVerified を埋める
            if (!existing.emailVerified) {
              await prisma.user.update({
                where: { id: existing.id },
                data: { emailVerified: new Date() },
              })
            }
            user.id = existing.id
            ;(user as { role?: string }).role = "seeker"
          }
        }
      }
      return true
    },
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.companyId = (user as { companyId?: string }).companyId
        token.mustChangePassword =
          (user as { mustChangePassword?: boolean }).mustChangePassword ?? false
      }
      // PW 変更後の update() 呼び出しでフラグを下げる
      if (trigger === "update") {
        token.mustChangePassword = false
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role: string }).role = token.role as string
        ;(session.user as { companyId?: string }).companyId =
          token.companyId as string | undefined
        ;(session.user as { mustChangePassword?: boolean }).mustChangePassword =
          (token.mustChangePassword as boolean | undefined) ?? false
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
