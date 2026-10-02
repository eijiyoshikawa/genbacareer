import { permanentRedirect } from "next/navigation"

/**
 * 登録導線の一本化。
 *
 * 旧・単一フォーム登録(/register)は廃止し、ウィザード(/register/wizard)へ集約する。
 * 既存リンク・ブックマーク・外部流入はここで wizard へ 308 恒久リダイレクトする
 * （ヘッダー / フッター / member-cta は元から wizard を指しているため、これで
 * すべての登録入口が wizard に統一される）。callbackUrl は引き継ぐ。
 */
export default async function RegisterPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | undefined>>
}) {
  const cb = (await searchParams)?.callbackUrl
  permanentRedirect(
    cb ? `/register/wizard?callbackUrl=${encodeURIComponent(cb)}` : "/register/wizard"
  )
}
