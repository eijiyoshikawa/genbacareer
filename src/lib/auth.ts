import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { awardSignupBonus } from "./points"
import Google from "next-auth/providers/google"
import Line from "next-auth/providers/line"
import type { Provider } from "next-auth/providers"
import { compare } from "bcryptjs"
import { prisma } from "./db"
import { checkRateLimit } from "./rate-limit"
import { bindLineUserToAccount } from "./line-link"
import { ensureSchema } from "./ensure-schema"
import { createHash } from "node:crypto"

/** 求職者セッションを DB と突き合わせ直す間隔 */
const SEEKER_RECHECK_MS = 5 * 60 * 1000

/** passwordHash の変更検知用の短い指紋 (ハッシュ自体は JWT に入れない) */
function passwordFingerprint(hash: string | null): string {
  if (!hash) return "none"
  return createHash("sha256").update(hash).digest("hex").slice(0, 16)
}

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

// LINE Login (optional) — 公式プロバイダを使用。
// 手書きの汎用 OIDC 設定だと LINE 必須の `state` パラメータが送られず
// authorize が INVALID_REQUEST ("'state' is not specified.") で即エラーになる。
// 公式プロバイダは checks:["state"] と id_token の HS256 検証を内蔵している。
// 注: LINE Login の email scope は別途権限申請が必要なため、profile + openid のみ要求。
// email が取れないケースに備え、profile() で LINE sub からプレースホルダ email を生成する。
if (process.env.LINE_CLIENT_ID && process.env.LINE_CLIENT_SECRET) {
  providers.push(
    Line({
      clientId: process.env.LINE_CLIENT_ID,
      clientSecret: process.env.LINE_CLIENT_SECRET,
      authorization: {
        // bot_prompt=aggressive: チャネルに公式アカウントをリンクしておくと、
        // ログイン時に友だち追加が促され、その後 Push 送信が可能になる。
        params: { scope: "profile openid", bot_prompt: "aggressive" },
      },
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email ?? `line_${profile.sub}@line.local`,
          image: profile.picture,
        }
      },
    }),
  )
}

// Admin credentials
if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD_HASH) {
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
        if (credentials.email !== process.env.ADMIN_EMAIL) return null

        const isValid = await compare(
          credentials.password as string,
          process.env.ADMIN_PASSWORD_HASH!
        )
        if (!isValid) return null

        return {
          id: "admin",
          email: process.env.ADMIN_EMAIL,
          name: "管理者",
          role: "admin" as const,
        }
      },
    })
  )
}

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

        // API route のみを経由するためレイアウト側の ensureSchema (fire-and-forget)
        // が間に合わないことがある。ここでは明示的に await して確実に反映させる
        // (2 回目以降は inflight memoize により即解決)。
        await ensureSchema()

        // 未反映カラム (ensureSchema が ENSURE_SCHEMA=false でスキップされている間) が
        // 追加されるたびにログインが P2022/カラム不在エラーで壊れないよう、
        // 認証に必要な列だけを明示 select する (company-credentials と同じ対策)。
        const seekerSelect = {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
          status: true,
        } as const
        const rawEmail = (credentials.email as string).trim()
        let user = await prisma.user.findUnique({
          where: { email: rawEmail },
          select: seekerSelect,
        })
        // 登録時は小文字に正規化して保存する。入力の大文字小文字違い
        // (スマホの自動大文字化など) でログインできなくなるのを防ぐ。
        if (!user && rawEmail !== rawEmail.toLowerCase()) {
          user = await prisma.user.findUnique({
            where: { email: rawEmail.toLowerCase() },
            select: seekerSelect,
          })
        }

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

        // 同上: API route のみのためレイアウト側の self-heal に頼れない
        await ensureSchema()

        const companyRawEmail = (credentials.email as string).trim()
        const companySelect = {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            role: true,
            companyId: true,
            mustChangePassword: true,
            totpEnabled: true,
            totpSecret: true,
            totpRecoveryCodes: true,
          } as const
        let companyUser = await prisma.companyUser.findUnique({
          where: { email: companyRawEmail },
          select: companySelect,
        })
        // 登録時は小文字に正規化して保存する。大文字小文字違いの入力でも
        // ログインできるようにする (求職者ログインと同じ扱い)。
        if (!companyUser && companyRawEmail !== companyRawEmail.toLowerCase()) {
          companyUser = await prisma.companyUser.findUnique({
            where: { email: companyRawEmail.toLowerCase() },
            select: companySelect,
          })
        }

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
            // CAS: 読み取り時点の一覧と一致する場合のみ書き込む。
            // 同一コードでの並行ログインが両方とも検証を通過してしまい、
            // 使い切りのはずのリカバリコードで複数セッションを認証できて
            // しまうレースを防ぐ（後勝ちの update だと片方が黙って上書きされる）。
            const cas = await prisma.companyUser.updateMany({
              where: {
                id: companyUser.id,
                totpRecoveryCodes: { equals: companyUser.totpRecoveryCodes },
              },
              data: { totpRecoveryCodes: consumed.remaining },
            })
            if (cas.count === 0) {
              throw new Error("TOTP_INVALID")
            }
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
      // admin-credentials も除外: admin ログイン直後にこの分岐に入ると、
      // role を "seeker" に上書きされて /admin から弾かれるバグ防止 (旧 #123)
      if (
        account?.provider &&
        account.provider !== "seeker-credentials" &&
        account.provider !== "company-credentials" &&
        account.provider !== "admin-credentials"
      ) {
        // 方法A: LINE ログインは、まず lineUserId で既存アカウントを検索する。
        // Google / メールで登録し「LINE 連携」済みのアカウントがあれば、
        // その同一アカウントにログインさせる（placeholder アカウントを新規作成しない）。
        // これで「Google / メール / LINE のどのボタンからでも同じ 1 アカウント」に入れる。
        if (account.provider === "line" && account.providerAccountId) {
          // 検索に失敗しても LINE ログイン自体は壊さない（DB drift 等で
          // 例外が出ると OAuth コールバック全体がエラーになりループするため）。
          try {
            const linked = await prisma.user.findFirst({
              where: { lineUserId: account.providerAccountId },
              select: { id: true, emailVerified: true, status: true },
              // 退会済みの行が残っていても、再登録・再連携した有効なアカウントを
              // 優先する ("active" < "deleted" < "suspended" の昇順)。
              orderBy: [{ status: "asc" }, { createdAt: "asc" }],
            })
            if (linked) {
              // 凍結 / 退会済みは OAuth 経由でもログイン拒否
              // （credentials ログインと同じ扱いに揃える）
              if (linked.status === "suspended" || linked.status === "deleted") {
                return false
              }
              if (!linked.emailVerified) {
                await prisma.user
                  .update({
                    where: { id: linked.id },
                    data: { emailVerified: new Date() },
                  })
                  .catch(() => {})
              }
              user.id = linked.id
              ;(user as { role?: string }).role = "seeker"
              return true
            }
          } catch (e) {
            console.error(
              "[auth.line] lineUserId lookup failed (fallback to email path):",
              e instanceof Error ? e.message : e,
            )
          }
        }

        if (user.email) {
          let existing = await prisma.user.findUnique({
            where: { email: user.email },
            select: {
              id: true,
              emailVerified: true,
              status: true,
              authProvider: true,
              passwordHash: true,
            },
          })
          if (!existing) {
            // OAuth プロバイダ経由のメールは確認済みとみなす（Google/LINE が検証済みのため）
            try {
              const created = await prisma.user.create({
                data: {
                  email: user.email,
                  name: user.name ?? null,
                  authProvider: account.provider,
                  emailVerified: new Date(),
                  // スカウト受信の前提となる企業公開は既定で ON
                  profilePublic: true,
                },
              })
              user.id = created.id
              ;(user as { role?: string }).role = "seeker"
              // 初回登録ボーナス (dedupeKey で 1 回のみ)。失敗してもログインは通す
              await awardSignupBonus(created.id).catch(() => {})
            } catch {
              // 二重クリック / 複数タブの同時ログインで create が競合 (P2002)
              // した場合は、勝った方のレコードを引き直してそのままログインさせる
              existing = await prisma.user.findUnique({
                where: { email: user.email },
                select: {
              id: true,
              emailVerified: true,
              status: true,
              authProvider: true,
              passwordHash: true,
            },
              })
              if (!existing) return false
            }
          }
          if (existing) {
            // 凍結 / 退会済みは OAuth 経由でもログイン拒否
            // （credentials ログインと同じ扱いに揃える）
            if (existing.status === "suspended" || existing.status === "deleted") {
              return false
            }
            // アカウント先取り (pre-hijack) 対策:
            // メール登録はアドレスの所有確認なしで作成できる (ウィザードは登録時に
            // 確認済み扱い)。第三者が他人のアドレス + 自分のパスワードで先に登録して
            // おくと、本人が後から Google / LINE でログインした時に同じ行へ合流し、
            // 第三者のパスワードが有効なまま履歴書・応募内容を読まれる。
            // プロバイダが所有を証明した最初の OAuth ログイン時に、メール登録時の
            // パスワードを無効化する (本人が使っていた場合は「パスワードを忘れた」から
            // 再設定できる)。passwordHash の変更で既存セッションは 5 分以内に失効する。
            const takeover =
              existing.authProvider === "email" && !!existing.passwordHash
            if (takeover || !existing.emailVerified) {
              // 既存ユーザーが OAuth で初めてログインした場合も emailVerified を埋める
              // （失敗してもログイン自体は通す — 非致命）
              await prisma.user
                .update({
                  where: { id: existing.id },
                  data: {
                    ...(existing.emailVerified ? {} : { emailVerified: new Date() }),
                    ...(takeover
                      ? { passwordHash: null, authProvider: account.provider }
                      : {}),
                  },
                })
                .catch(() => {})
            }
            user.id = existing.id
            ;(user as { role?: string }).role = "seeker"
          }

          // LINE ログイン経由なら sub(=Messaging API userId) を User へ紐付け、
          // 配信パイプライン(LineLead)にも反映する。これで LINE 登録ユーザーも
          // 即「LINE 到達可能」になる。
          if (account.provider === "line" && account.providerAccountId && user.id) {
            await bindLineUserToAccount({
              userId: user.id,
              lineUserId: account.providerAccountId,
              displayName: user.name ?? null,
              email: user.email,
            }).catch(() => {})
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
      // PW 変更後の update() 呼び出しでフラグを下げる。
      // クライアントから update() を呼ぶだけで初回 PW 変更の強制を外せないよう、
      // 企業ユーザーは DB の実フラグを読み直す (読めなければ現状維持)。
      if (trigger === "update") {
        if (token.role === "seeker" || token.role === "admin") {
          token.mustChangePassword = false
        } else if (typeof token.id === "string") {
          const cu = await prisma.companyUser
            .findUnique({
              where: { id: token.id },
              select: { mustChangePassword: true },
            })
            .catch(() => undefined)
          if (cu === null) return null
          if (cu) token.mustChangePassword = cu.mustChangePassword
        }
      }

      // 求職者セッションの定期再検証。JWT は既定で 30 日有効なため、
      // 凍結・退会・パスワード再設定の後も古い端末のセッションが生き続けていた。
      // 5 分に 1 回だけ DB を見て、無効なら null を返してセッションを破棄する。
      // DB 障害時はログイン状態を維持する (fail-open)。
      if (token.role === "seeker" && typeof token.id === "string") {
        const now = Date.now()
        const checkedAt =
          typeof token.checkedAt === "number" ? token.checkedAt : 0
        if (user || now - checkedAt > SEEKER_RECHECK_MS) {
          const row = await prisma.user
            .findUnique({
              where: { id: token.id },
              select: { status: true, passwordHash: true },
            })
            .catch(() => undefined)
          if (row === null) return null
          if (row) {
            if (row.status === "suspended" || row.status === "deleted") {
              return null
            }
            const fp = passwordFingerprint(row.passwordHash)
            // 発行時と passwordHash が変わっていれば (再設定・変更) 破棄。
            // 指紋を持たない旧トークンは初回に記録するだけで破棄しない。
            if (!user && typeof token.pwf === "string" && token.pwf !== fp) {
              return null
            }
            token.pwf = fp
            token.checkedAt = now
          }
        }
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
