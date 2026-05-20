import Link from "next/link"
import { prisma } from "@/lib/db"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "メールアドレスの確認",
}

type Props = {
  searchParams: Promise<{ token?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams

  if (!token) {
    return (
      <Container>
        <h1 className="text-xl font-semibold text-gray-900">
          確認リンクが指定されていません
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          メールに記載されているリンクからアクセスしてください。
        </p>
        <ResendForm />
      </Container>
    )
  }

  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: token },
    select: { id: true, emailVerifyTokenExpiry: true, emailVerifiedAt: true },
  })

  if (!user) {
    return (
      <Container>
        <h1 className="text-xl font-semibold text-red-700">
          確認リンクが無効です
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          リンクの有効期限が切れているか、すでに使用されています。
        </p>
        <ResendForm />
      </Container>
    )
  }

  if (user.emailVerifiedAt) {
    return (
      <Container>
        <h1 className="text-xl font-semibold text-gray-900">確認済みです</h1>
        <p className="mt-2 text-sm text-gray-600">
          このメールアドレスはすでに確認されています。
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ログインへ →
        </Link>
      </Container>
    )
  }

  if (!user.emailVerifyTokenExpiry || user.emailVerifyTokenExpiry < new Date()) {
    return (
      <Container>
        <h1 className="text-xl font-semibold text-red-700">
          確認リンクの有効期限が切れています
        </h1>
        <ResendForm />
      </Container>
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyTokenExpiry: null,
    },
  })

  return (
    <Container>
      <h1 className="text-xl font-semibold text-green-700">
        メールアドレスを確認しました
      </h1>
      <p className="mt-2 text-sm text-gray-600">
        ご確認ありがとうございました。ログインしてサービスをご利用ください。
      </p>
      <Link
        href="/login"
        className="mt-4 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        ログインへ
      </Link>
    </Container>
  )
}

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-md px-4 py-12 sm:px-6 lg:px-8">
      <div className="rounded-lg border bg-white p-6 shadow-sm">{children}</div>
    </div>
  )
}

function ResendForm() {
  return (
    <form action="/api/auth/resend-verification" method="POST" className="mt-4">
      <Link
        href="/login"
        className="inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ログインからメールアドレスを変更 / 再送
      </Link>
    </form>
  )
}
