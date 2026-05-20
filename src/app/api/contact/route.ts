import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import {
  sendContactReceivedEmail,
  sendContactAdminNotification,
} from "@/lib/email"
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255),
  category: z.enum(["general", "job_posting", "account", "bug", "other"]),
  body: z.string().min(1).max(5000),
})

export async function POST(request: NextRequest) {
  // Rate limit: 5 contacts per IP per hour
  const ipLimit = rateLimit(
    `contact:${getClientIp(request)}`,
    5,
    60 * 60 * 1000
  )
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterMs)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data

  await prisma.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      category: data.category,
      body: data.body,
    },
  })

  // Fire-and-forget notifications
  sendContactReceivedEmail({
    to: data.email,
    name: data.name,
    category: data.category,
    body: data.body,
  }).catch((err) => console.error("[contact] received email failed:", err))

  sendContactAdminNotification({
    name: data.name,
    email: data.email,
    category: data.category,
    body: data.body,
  }).catch((err) => console.error("[contact] admin notification failed:", err))

  return Response.json({ success: true })
}
