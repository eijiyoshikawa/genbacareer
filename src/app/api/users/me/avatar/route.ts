/**
 * 求職者の顔写真（プロフィール画像）。
 *
 *   POST   /api/users/me/avatar  … multipart/form-data の `file` をアップロードして差し替え
 *   DELETE /api/users/me/avatar  … 削除
 *
 * 画像は Supabase Storage（company-media/user-avatars/{userId}/）に保存し、
 * User.avatarUrl に公開 URL を持つ。差し替え/削除時は旧ファイルも消す。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  uploadUserAvatar,
  deleteCompanyImage,
  extractPathFromUrl,
} from "@/lib/storage-images"

export async function POST(request: Request) {
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, avatarUrl: true },
  })
  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }

  let file: File | null = null
  try {
    const formData = await request.formData()
    const f = formData.get("file")
    if (f instanceof File) file = f
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 },
    )
  }
  if (!file) {
    return Response.json({ error: "ファイルを選択してください" }, { status: 400 })
  }

  try {
    const { url } = await uploadUserAvatar(user.id, file)

    await prisma.user.update({
      where: { id: user.id },
      data: { avatarUrl: url },
      select: { id: true },
    })

    // 旧ファイルの掃除（失敗しても本処理は成功扱い）
    if (user.avatarUrl) {
      const oldPath = extractPathFromUrl(user.avatarUrl)
      if (oldPath) await deleteCompanyImage(oldPath)
    }

    return Response.json({ ok: true, url })
  } catch (e) {
    const msg =
      e instanceof Error ? e.message : "アップロードに失敗しました"
    return Response.json({ error: msg }, { status: 400 })
  }
}

export async function DELETE() {
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, avatarUrl: true },
  })
  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
    select: { id: true },
  })

  if (user.avatarUrl) {
    const path = extractPathFromUrl(user.avatarUrl)
    if (path) await deleteCompanyImage(path)
  }

  return Response.json({ ok: true })
}
