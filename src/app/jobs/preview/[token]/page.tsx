/**
 * 求人プレビュー URL: `/jobs/preview/<token>`
 *
 * 下書き状態の求人を社内チェック用に共有するためのエントリーポイント。
 * トークンを Job.previewToken と照合し、一致すれば /jobs/<id> へリダイレクト。
 * previewToken をクエリとして引き継ぎ、/jobs/<id> 側で status !== "active" の
 * 場合に再度照合する（UUID を直接知っているだけの第三者や、トークンを
 * 無効化された後の古いリンクからはアクセスできないようにするため）。
 *
 * トークン不一致や未設定の場合は 404。
 */

import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export default async function JobPreviewPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  if (!token || token.length < 16 || token.length > 64) {
    notFound()
  }

  const job = await prisma.job
    .findUnique({
      where: { previewToken: token },
      select: { id: true },
    })
    .catch(() => null)

  if (!job) {
    notFound()
  }

  // 既存の求人詳細ページに転送。previewToken も引き継ぎ、遷移先で再照合する。
  redirect(
    `/jobs/${job.id}?preview=1&previewToken=${encodeURIComponent(token)}`
  )
}
