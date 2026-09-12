/**
 * 求人プレビュー URL: `/jobs/preview/<token>`
 *
 * 下書き状態の求人を社内チェック用に共有するためのエントリーポイント。
 * トークンを Job.previewToken と照合し、一致すれば /jobs/<id> へリダイレクト。
 * リダイレクト先の `preview` クエリには実トークン値をそのまま引き継ぐ
 * （/jobs/<id> 側で再度 Job.previewToken と照合するため、固定値だと
 *  誰でも `?preview=1` を付けるだけでログイン壁を回避できてしまう）。
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

  // 既存の求人詳細ページに転送（status を問わず描画される現行仕様を活用）。
  // preview には実トークンを渡し、遷移先で再照合できるようにする。
  redirect(`/jobs/${job.id}?preview=${encodeURIComponent(token)}`)
}
