/**
 * POST /api/line/webhook
 *
 * LINE Messaging API の Webhook 受信エンドポイント。
 *
 * - X-Line-Signature を検証（HMAC-SHA256 + base64）
 * - イベント種別ごとの処理:
 *   - follow: 友だち追加 → グリーティング + プロフィール保存 + 「ご応募時に入力した電話番号を送ってください」案内
 *   - message(text):
 *     - オプトアウト/イン キーワード判定
 *     - 電話番号 / メールが含まれていれば近日中の lead と自動 bind
 *     - FAQ パターン応答
 *   - unfollow: lineUserId をクリア（取り消し対応）
 *
 * 環境変数:
 *   LINE_CHANNEL_ACCESS_TOKEN
 *   LINE_CHANNEL_SECRET
 */

import { type NextRequest } from "next/server"
import {
  verifyWebhookSignature,
  replyMessage,
  getUserProfile,
  isMessagingConfigured,
} from "@/lib/line-messaging"
import { prisma } from "@/lib/db"
import { generateAiReply, isAiReplyConfigured } from "@/lib/ai-reply"
import { checkRateLimit } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

interface LineEvent {
  type: string
  replyToken?: string
  source?: { userId?: string }
  timestamp?: number
  message?: { type?: string; text?: string }
}

const GREETING_TEXT = [
  "ご登録ありがとうございます🎉",
  "",
  "ゲンバキャリア公式 LINE です。",
  "気になる求人があればお気軽にメッセージください。担当者が 1 営業日以内にご返信します。",
  "",
  "▼ お申し込み済みの方へ",
  "応募フォームでご入力いただいた電話番号 or メールアドレスをこのトークに送ってください。",
  "応募内容と紐付けて、より早く担当者から折り返しできます。",
  "",
  "▼ よくあるご質問",
  "・「求人」と送ると最新の求人をご案内",
  "・「料金」と送ると料金体系をご案内",
  "・「会社」と送ると運営会社情報をご案内",
].join("\n")

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

// 直近 14 日以内の lead と自動 bind する
const AUTO_BIND_WINDOW_DAYS = 14

function isOptOutRequest(input: string): boolean {
  const normalized = input.replace(/\s+/g, "").toLowerCase()
  if (normalized.length > 30) return false
  return /^(配信停止|停止|ストップ|stop|unsubscribe|解除|配信解除)$/.test(normalized)
}
function isOptInRequest(input: string): boolean {
  const normalized = input.replace(/\s+/g, "").toLowerCase()
  if (normalized.length > 30) return false
  return /^(配信再開|再開|start|subscribe)$/.test(normalized)
}

// メッセージから電話番号らしき文字列を抽出（日本の番号、+81 形式も対応）
const PHONE_REGEX = /(?:\+?81[-\s]?|0)\d{1,4}[-\s]?\d{1,4}[-\s]?\d{3,4}/g
// メッセージから email を抽出
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g

/**
 * 入力テキストから電話番号 or メールを抽出し、直近 N 日以内の未 bind lead と
 * マッチさせて lineUserId を結合する。
 *
 * 戻り値: bind した lead の name（あれば挨拶に使う）or null
 */
async function tryAutoBind(
  userId: string,
  displayName: string | null,
  text: string
): Promise<{ leadName: string; jobTitle: string | null } | null> {
  // 電話番号正規化: 数字とハイフン以外を除去
  const phoneCandidates = (text.match(PHONE_REGEX) ?? []).map((p) =>
    p.replace(/[\s+]/g, "")
  )
  const emailCandidates = text.match(EMAIL_REGEX) ?? []
  if (phoneCandidates.length === 0 && emailCandidates.length === 0) return null

  // 他人の電話番号/メールを連投して lead を割り出す総当たり攻撃を抑止する
  // (電話番号の下 8 桁一致は本人以外でも知り得る情報のため、試行回数を絞って
  //  総当たりで他人の氏名・応募求人を推測されるリスクを下げる)
  const rl = checkRateLimit({
    key: `line-autobind:${userId}`,
    limit: 5,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!rl.allowed) return null

  const since = new Date(Date.now() - AUTO_BIND_WINDOW_DAYS * 24 * 60 * 60 * 1000)

  // Prisma で電話番号は正規化保存ではないので、保存フォーマット揺れに対応するため
  // 最後 8 桁が一致するもので拾う（市外局番無し / 0 始まり / +81 など揺れ吸収）
  const phoneLast8s = phoneCandidates
    .map((p) => p.replace(/\D/g, ""))
    .filter((p) => p.length >= 8)
    .map((p) => p.slice(-8))

  const candidates = await prisma.lineLead
    .findMany({
      where: {
        lineUserId: null,
        createdAt: { gte: since },
        OR: [
          ...(phoneLast8s.length > 0
            ? phoneLast8s.map((tail) => ({
                phone: { endsWith: tail },
              }))
            : []),
          ...(emailCandidates.length > 0
            ? [{ email: { in: emailCandidates } }]
            : []),
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: {
        id: true,
        name: true,
        job: { select: { title: true } },
      },
    })
    .catch(() => [])

  if (candidates.length === 0) return null
  const lead = candidates[0]

  try {
    await prisma.lineLead.update({
      where: { id: lead.id },
      data: {
        lineUserId: userId,
        lineDisplayName: displayName,
        status: "line_added",
      },
    })
  } catch {
    return null
  }
  return { leadName: lead.name, jobTitle: lead.job?.title ?? null }
}

function autoReplyText(input: string): string | null {
  const normalized = input.replace(/\s+/g, "").toLowerCase()
  if (/求人|もとめる|求める|探/.test(normalized)) {
    return `最新の建設業求人はこちらからご覧いただけます👷‍♂️\n${SITE_URL}/jobs\n\n気になる求人が見つかりましたら、URL を貼り付けてお送りください。`
  }
  if (/料金|費用|プラン/.test(normalized)) {
    return [
      "💴 ご利用料金（求職者の方）",
      "完全無料です。",
      "",
      "💴 ご利用料金（企業様）",
      "・掲載料: 無料キャンペーン中",
      "・成果報酬: 1 名 49.8 万円〜（職種による）",
      "",
      `詳しくは: ${SITE_URL}/for-employers`,
    ].join("\n")
  }
  if (/会社|運営|company/.test(normalized)) {
    return [
      "運営会社: 株式会社LET",
      "所在地: 大阪府大阪市中央区南久宝寺町 4-4-12 IB CENTER ビル 8F",
      "TEL: 06-6786-8320",
      "",
      `詳しくは: ${SITE_URL}/about`,
    ].join("\n")
  }
  if (/ありがとう|thanks/.test(normalized)) {
    return "ご連絡ありがとうございます。担当者が改めてご返信いたします📝"
  }
  return null
}

export async function POST(request: NextRequest) {
  if (!isMessagingConfigured()) {
    console.warn("[line.webhook] LINE_CHANNEL_ACCESS_TOKEN / SECRET が未設定のため処理をスキップ")
    return new Response(null, { status: 200 })
  }

  const signature = request.headers.get("x-line-signature")
  const rawBody = await request.text()

  if (!verifyWebhookSignature(rawBody, signature)) {
    console.warn("[line.webhook] 署名検証失敗")
    return new Response("invalid signature", { status: 401 })
  }

  let payload: { events?: LineEvent[] }
  try {
    payload = JSON.parse(rawBody) as { events?: LineEvent[] }
  } catch {
    return new Response("invalid json", { status: 400 })
  }

  const events = payload.events ?? []
  await Promise.allSettled(events.map((ev) => handleEvent(ev)))

  return new Response(null, { status: 200 })
}

async function handleEvent(ev: LineEvent): Promise<void> {
  try {
    if (ev.type === "follow") {
      const userId = ev.source?.userId
      const profile = userId ? await getUserProfile(userId).catch(() => null) : null

      // プロフィール取得済みなら、過去 14 日の lead に displayName を伝播
      if (userId && profile) {
        await prisma.lineLead
          .updateMany({
            where: { lineUserId: userId },
            data: { lineDisplayName: profile.displayName, status: "line_added" },
          })
          .catch(() => {})
      }

      if (ev.replyToken) {
        await replyMessage(ev.replyToken, [{ type: "text", text: GREETING_TEXT }])
      }
      return
    }

    if (ev.type === "unfollow") {
      const userId = ev.source?.userId
      // 友だち削除時は lineUserId をクリア（再追加時の混乱回避）
      if (userId) {
        await prisma.lineLead
          .updateMany({
            where: { lineUserId: userId },
            data: { lineUserId: null },
          })
          .catch(() => {})
      }
      return
    }

    if (ev.type === "message" && ev.message?.type === "text" && ev.replyToken) {
      const text = ev.message.text ?? ""
      const userId = ev.source?.userId

      // オプトアウト要求の検出
      if (isOptOutRequest(text) && userId) {
        const updated = await prisma.lineLead
          .updateMany({
            where: { lineUserId: userId, optedOut: false },
            data: {
              optedOut: true,
              optedOutAt: new Date(),
              optedOutSource: "webhook",
            },
          })
          .catch(() => ({ count: 0 }))
        const ack =
          updated.count > 0
            ? "配信停止を承りました。今後の一括配信は届きません。\n再開希望時は「再開」とお送りください。"
            : "配信停止のリクエストを受け付けました。"
        await replyMessage(ev.replyToken, [{ type: "text", text: ack }])
        return
      }

      // オプトイン（再開）要求
      if (isOptInRequest(text) && userId) {
        await prisma.lineLead
          .updateMany({
            where: { lineUserId: userId, optedOut: true },
            data: { optedOut: false, optedOutAt: null, optedOutSource: null },
          })
          .catch(() => {})
        await replyMessage(ev.replyToken, [
          { type: "text", text: "配信を再開しました。今後新着求人をお送りします。" },
        ])
        return
      }

      // プロフィール取得（自動 bind と AI 応答で共用）
      const profile = userId ? await getUserProfile(userId).catch(() => null) : null

      // 自動 bind トライ（電話番号 / メールが含まれる場合）
      if (userId) {
        const bound = await tryAutoBind(userId, profile?.displayName ?? null, text)
        if (bound) {
          const msg = [
            `${bound.leadName} さん、応募内容と紐付けました🎉`,
            "",
            bound.jobTitle ? `▼ 応募求人\n${bound.jobTitle}` : "",
            "",
            "担当者より 1 営業日以内にこの LINE トークでご連絡いたします。",
          ]
            .filter(Boolean)
            .join("\n")
          await replyMessage(ev.replyToken, [{ type: "text", text: msg }])
          return
        }
      }

      // FAQ パターン応答（キーワード）
      const faqReply = autoReplyText(text)
      if (faqReply) {
        await replyMessage(ev.replyToken, [{ type: "text", text: faqReply }])
        return
      }

      // AI フォールバック（ANTHROPIC_API_KEY 設定時のみ）
      if (isAiReplyConfigured()) {
        const aiReply = await generateAiReply(text, profile?.displayName ?? null)
        if (aiReply) {
          await replyMessage(ev.replyToken, [{ type: "text", text: aiReply }])
          return
        }
      }

      // どれにも該当しない場合は無音（運営が個別対応）
      return
    }
  } catch (e) {
    console.error(`[line.webhook] handleEvent failed: ${e instanceof Error ? e.message : e}`)
  }
}
