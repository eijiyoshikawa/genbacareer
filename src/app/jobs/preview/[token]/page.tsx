/**
 * 求人プレビュー URL: `/jobs/preview/<token>`
 *
 * 下書き状態の求人を社内チェック用に共有するためのエントリーポイント。
 * トークンを Job.previewToken と照合し、一致すれば /jobs/<id> へリダイレクト。
 * /jobs/<id> 側でも同じトークンを ?previewToken= から再検証してから
 * status を問わず描画する（トークンを渡さない直接アクセスでは非 active 求人は 404）。
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

  // 求人詳細ページへ転送。トークンをそのまま引き継ぎ、遷移先で再検証させる。
  redirect(`/jobs/${job.id}?previewToken=${encodeURIComponent(token)}`)
}
