/**
 * 求人プレビュー URL: `/jobs/preview/<token>`
 *
 * 下書き状態の求人を社内チェック用に共有するためのエントリーポイント。
 * トークンを Job.previewToken と照合し、一致すれば /jobs/<id> へリダイレクト。
 * （/jobs/<id> 自身は status を問わずレンダリングする既存挙動を維持）
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
      select: { id: true, previewToken: true },
    })
    .catch(() => null)

  if (!job) {
    notFound()
  }

  // 既存の求人詳細ページに転送（status を問わず描画される現行仕様を活用）。
  // previewToken をクエリに含めることで、/jobs/<id> 側でトークン一致を再検証できるようにする
  // （?preview=1 のような固定フラグだけだと誰でも付け足してゲスト閲覧制限を回避できてしまうため）。
  redirect(`/jobs/${job.id}?previewToken=${encodeURIComponent(job.previewToken!)}`)
}
