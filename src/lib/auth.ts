import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import type { Provider } from "next-auth/providers"
import { compare } from "bcryptjs"
import { prisma } from "./db"

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

// Credential providers (always available)
providers.push(
  Credentials({
      id: "seeker-credentials",
      name: "求職者ログイン",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.passwordHash || user.deletedAt) return null

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
      },
      async authorize(credentials) {
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

        return {
          id: companyUser.id,
          email: companyUser.email,
          name: companyUser.name,
          role: companyUser.role === "admin" ? "company_admin" : "company_member",
          companyId: companyUser.companyId,
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
    async signIn({ user, account }) {
      // Auto-create user record for OAuth sign-ins
      if (account?.provider && account.provider !== "seeker-credentials" && account.provider !== "company-credentials") {
        if (user.email) {
          const existing = await prisma.user.findUnique({
            where: { email: user.email },
            select: { id: true, deletedAt: true },
          })
          if (!existing) {
            const created = await prisma.user.create({
              data: {
                email: user.email,
                name: user.name ?? null,
                authProvider: account.provider,
                emailVerifiedAt: new Date(), // OAuth providers verify email
              },
            })
            user.id = created.id
            ;(user as { role?: string }).role = "seeker"
          } else {
            if (existing.deletedAt) return false
            user.id = existing.id
            ;(user as { role?: string }).role = "seeker"
          }
        }
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role: string }).role
        token.companyId = (user as { companyId?: string }).companyId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { role: string }).role = token.role as string
        ;(session.user as { companyId?: string }).companyId =
          token.companyId as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
