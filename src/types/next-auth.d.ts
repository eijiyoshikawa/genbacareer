import "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    companyId?: string
  }

  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: string
      companyId?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    companyId?: string
    // アカウント状態の定期再チェック用（凍結/却下後の revocation gap 対策）。
    statusCheckedAt?: number
    revoked?: boolean
  }
}
