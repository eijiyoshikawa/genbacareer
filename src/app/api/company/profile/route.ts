/**
 * PATCH /api/company/profile
 *
 * 企業ユーザーが自社のリッチコンテンツ（タグライン / ピッチ / 写真 / SNS）を更新する。
 * 承認待ちでも閲覧と編集は可能（公開反映は status=approved になってから）。
 *
 * 保存と同時に `lastContentUpdatedAt` を now() に更新 → 求人一覧の並び順
 * 評価に直結する。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { isCompanyAuthError, requireCompanyAuth } from "@/lib/company-auth"
import { computeRankScore } from "@/lib/ranking"
import { isSafeSchedulingUrl } from "@/lib/scheduling-urls"

export const dynamic = "force-dynamic"

const profileSchema = z.object({
  tagline: z.string().max(200).optional().default(""),
  pitchHighlights: z.string().max(4000).optional().default(""),
  idealCandidate: z.string().max(4000).optional().default(""),
  employeeVoice: z.string().max(4000).optional().default(""),
  // logoUrl / photos も schedulingUrls と同じ基準（https のみ、
  // localhost / private IP 拒否）を課す。通常は ImageUploader が返す
  // 自社ストレージ URL しか送られてこないが、API を直接叩けば任意の
  // 外部 URL を保存できてしまい、求人カードや企業ページ・サイトマップに
  // そのまま埋め込まれる（schedulingUrls には既に同じ理由で適用済み）。
  logoUrl: safeUrlOrEmpty(),
  photos: z
    .array(
      z
        .string()
        .url()
        .max(500)
        .refine(isSafeSchedulingUrl, {
          message: "画像 URL は https:// で始まる公開 URL のみ使用できます",
        })
    )
    .max(12)
    .optional()
    .default([]),
  // isSafeSchedulingUrl と同じ基準（https のみ、localhost / private IP 拒否）を
  // 書き込み時にも強制する。ここで緩いチェックのまま保存を許すと、
  // 保存自体は成功するのに読み取り側 (parseSchedulingUrls) で黙って
  // フィルタされ、企業側からは「保存したのに消えた」ようにしか見えない。
  schedulingUrls: z
    .array(
      z.object({
        name: z.string().min(1).max(60),
        url: z
          .string()
          .url()
          .max(500)
          .refine(isSafeSchedulingUrl, {
            message:
              "スケジューリング URL は https:// で始まる公開 URL のみ使用できます",
          }),
        primary: z.boolean().optional(),
      })
    )
    .max(10)
    .optional()
    .default([]),
  instagramUrl: urlOrEmpty(),
  tiktokUrl: urlOrEmpty(),
  facebookUrl: urlOrEmpty(),
  xUrl: urlOrEmpty(),
  youtubeUrl: urlOrEmpty(),
})

function urlOrEmpty() {
  return z
    .string()
    .max(500)
    .optional()
    .default("")
    .refine(
      (v) => !v || /^https?:\/\//i.test(v),
      "URL は http(s):// で始めてください"
    )
}

// logoUrl は <img> として公開ページに直接埋め込まれるため、schedulingUrls /
// photos と同じ厳格な基準（https のみ、localhost / private IP 拒否）を課す。
function safeUrlOrEmpty() {
  return z
    .string()
    .max(500)
    .optional()
    .default("")
    .refine((v) => !v || isSafeSchedulingUrl(v), {
      message: "URL は https:// で始まる公開 URL のみ使用できます",
    })
}

function emptyToNull(s: string | undefined): string | null {
  if (!s) return null
  const t = s.trim()
  return t.length === 0 ? null : t
}

export async function PATCH(request: NextRequest) {
  const ctx = await requireCompanyAuth()
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  let body: z.infer<typeof profileSchema>
  try {
    body = profileSchema.parse(await request.json())
  } catch (err) {
    return Response.json(
      {
        error: "invalid_body",
        issues: err instanceof z.ZodError ? err.issues : [],
      },
      { status: 400 }
    )
  }

  const updated = await prisma.company.update({
    where: { id: ctx.companyId },
    data: {
      tagline: emptyToNull(body.tagline),
      pitchHighlights: emptyToNull(body.pitchHighlights),
      idealCandidate: emptyToNull(body.idealCandidate),
      employeeVoice: emptyToNull(body.employeeVoice),
      logoUrl: emptyToNull(body.logoUrl),
      photos: body.photos ?? [],
      schedulingUrls: (body.schedulingUrls ?? []) as unknown as object,
      instagramUrl: emptyToNull(body.instagramUrl),
      tiktokUrl: emptyToNull(body.tiktokUrl),
      facebookUrl: emptyToNull(body.facebookUrl),
      xUrl: emptyToNull(body.xUrl),
      youtubeUrl: emptyToNull(body.youtubeUrl),
      lastContentUpdatedAt: new Date(),
    },
    select: {
      tagline: true,
      pitchHighlights: true,
      idealCandidate: true,
      employeeVoice: true,
      logoUrl: true,
      photos: true,
      schedulingUrls: true,
      instagramUrl: true,
      tiktokUrl: true,
      facebookUrl: true,
      xUrl: true,
      youtubeUrl: true,
      lastContentUpdatedAt: true,
    },
  })

  // この企業の全求人の rankScore を再計算（求人一覧の並び順反映用）
  // - 企業の SNS / 文字量 / 写真 / 更新フレッシュ度 が変わったので求人ごとに再評価
  const companyJobs = await prisma.job.findMany({
    where: { companyId: ctx.companyId },
    select: {
      id: true,
      description: true,
      requirements: true,
      salaryMin: true,
      salaryMax: true,
      employmentType: true,
      workHours: true,
      holidays: true,
      insurance: true,
      bonus: true,
      commuteAllowance: true,
      companyFeatures: true,
      businessContent: true,
      publishedAt: true,
      expiresAt: true,
      viewCount: true,
    },
  })

  await Promise.all(
    companyJobs.map((job) =>
      prisma.job.update({
        where: { id: job.id },
        data: {
          rankScore: computeRankScore(job, updated),
        },
      })
    )
  )

  return Response.json({
    success: true,
    rerankedJobs: companyJobs.length,
  })
}
