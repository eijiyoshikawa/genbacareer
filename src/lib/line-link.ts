/**
 * LINE アカウント連携（求職者 User ⇔ LINE Messaging API userId）のヘルパー。
 *
 * メール / Google / LINE いずれの経路で登録しても、最終的に User へ LINE userId を
 * 紐付けて「LINE から運用アプローチ（Push / ダイジェスト / ブロードキャスト）」できる状態にする。
 *
 * 連携フロー（link-by-session）:
 *   1. ログイン中ユーザーが /api/line/link/start を叩く
 *   2. 現在の userId を署名付き state に載せて LINE ログイン(OAuth)へ
 *   3. /api/line/link/callback で state を検証し、LINE userId(sub) を取得
 *   4. bindLineUserToAccount で users.line_user_id を保存 + LineLead(follower) を upsert
 *
 * LINE はメールを返さないため、NextAuth の email マージは使わず state 内の userId で確実に紐付ける。
 */

import crypto from "node:crypto"
import { prisma } from "@/lib/db"

const STATE_TTL_MS = 10 * 60 * 1000 // 10 分

function secret(): string {
  // 署名鍵は NextAuth と同じ秘密を流用（本番では必ず設定済み）
  return process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "dev-insecure-secret"
}

/**
 * userId + nonce + 失効時刻を HMAC 署名した state 文字列を生成する。
 * 形式: base64url(payload).hex(signature)
 */
export function signLinkState(userId: string): string {
  const payload = JSON.stringify({
    uid: userId,
    n: crypto.randomBytes(8).toString("hex"),
    exp: Date.now() + STATE_TTL_MS,
  })
  const b64 = Buffer.from(payload).toString("base64url")
  const sig = crypto.createHmac("sha256", secret()).update(b64).digest("hex")
  return `${b64}.${sig}`
}

/** state を検証し、有効なら userId を返す。改ざん / 失効時は null。 */
export function verifyLinkState(state: string | null): string | null {
  if (!state) return null
  const dot = state.lastIndexOf(".")
  if (dot < 0) return null
  const b64 = state.slice(0, dot)
  const sig = state.slice(dot + 1)
  const expected = crypto.createHmac("sha256", secret()).update(b64).digest("hex")
  // タイミング安全比較（長さ不一致は即 false）
  if (
    sig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
  ) {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(b64, "base64url").toString("utf8")) as {
      uid?: string
      exp?: number
    }
    if (!payload.uid || !payload.exp || Date.now() > payload.exp) return null
    return payload.uid
  } catch {
    return null
  }
}

/**
 * LINE userId を User へ紐付け、配信パイプライン（LineLead）にも反映する。
 *
 * - users.line_user_id を保存（push 経路はまずここを見る）
 * - 同 lineUserId の LineLead があれば status/displayName を更新
 * - 無ければ「フォロワー」レコードを作成（email は User の実 email を入れ、
 *   email→LineLead 突き合わせのブロードキャスト/通知でも到達できるように）
 *
 * @returns "linked" | "already_linked_to_other_account" | "error"
 *   同じ lineUserId が既に別の User に紐付いている場合は上書きしない。
 *   上書きすると 1 つの LINE アカウントが複数の User に紐付いた状態になり、
 *   auth.ts の LINE ログイン解決 (findFirst + orderBy createdAt asc) が
 *   意図しないアカウントへログインさせてしまう恐れがあるため。
 */
export async function bindLineUserToAccount(input: {
  userId: string
  lineUserId: string
  displayName: string | null
  email: string | null
}): Promise<"linked" | "already_linked_to_other_account" | "error"> {
  const { userId, lineUserId, displayName, email } = input

  const conflictingOwner = await prisma.user
    .findFirst({ where: { lineUserId }, select: { id: true } })
    .catch(() => null)
  if (conflictingOwner && conflictingOwner.id !== userId) {
    console.warn(
      `[line-link] lineUserId ${lineUserId} already linked to a different user (${conflictingOwner.id}); refusing to relink to ${userId}`
    )
    return "already_linked_to_other_account"
  }

  // 1. User 本体へ保存（raw: Prisma Client 未再生成の環境でも動くよう updateMany 経由でなく
  //    型付き update を使う。lineUserId は schema に追加済み）
  const updated = await prisma.user
    .update({ where: { id: userId }, data: { lineUserId } })
    .then(() => true)
    .catch((e) => {
      console.warn(`[line-link] user update failed: ${e instanceof Error ? e.message : e}`)
      return false
    })
  if (!updated) return "error"

  // 2. LineLead 側へ反映（既存があれば更新、無ければフォロワー作成）
  const existing = await prisma.lineLead
    .findFirst({ where: { lineUserId }, select: { id: true } })
    .catch(() => null)

  if (existing) {
    await prisma.lineLead
      .update({
        where: { id: existing.id },
        data: { lineDisplayName: displayName ?? undefined },
      })
      .catch(() => {})
    return "linked"
  }

  await prisma.lineLead
    .create({
      data: {
        name: displayName?.trim()?.slice(0, 100) || "LINE 連携ユーザー",
        phone: "",
        email: email ?? "",
        lineUserId,
        lineDisplayName: displayName,
        status: "follower",
      },
    })
    .catch((e) =>
      console.warn(`[line-link] lead upsert failed: ${e instanceof Error ? e.message : e}`)
    )
  return "linked"
}
