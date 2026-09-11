import { ImageResponse } from "next/og"
import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import { sanitizeOgText } from "@/lib/og-text"

export const alt = "記事"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const CATEGORY_LABELS: Record<string, string> = {
  career: "転職・キャリア",
  salary: "年収・給与",
  license: "資格・免許",
  "job-type": "職種解説",
  industry: "業界知識",
  interview: "体験談",
  "help-seeker": "ヘルプ",
  "help-employer": "企業ヘルプ",
}

export default async function OGImage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const article = await prisma.article
    .findFirst({
      where: { slug, ...publishedArticleFilter() },
      select: {
        title: true,
        excerpt: true,
        category: true,
        authorName: true,
      },
    })
    .catch(() => null)

  const title = sanitizeOgText(truncate(article?.title ?? "ゲンバキャリア マガジン", 60))
  const excerpt = sanitizeOgText(truncate(article?.excerpt ?? "", 100))
  const authorName = sanitizeOgText(article?.authorName ?? "ゲンバキャリア編集部")
  const categoryLabel = article?.category
    ? CATEGORY_LABELS[article.category] ?? article.category
    : "マガジン"

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #be123c 0%, #e11d48 50%, #f43f5e 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "64px 72px",
          fontFamily: "sans-serif",
          position: "relative",
          color: "white",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
          }}
        />

        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 24,
            display: "flex",
            gap: 12,
          }}
        >
          <span>ゲンバキャリア マガジン</span>
          <span style={{ opacity: 0.5 }}>/</span>
          <span>{categoryLabel}</span>
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.25,
            marginBottom: 28,
            display: "flex",
          }}
        >
          {title}
        </div>

        {excerpt && (
          <div
            style={{
              fontSize: 26,
              color: "rgba(255,255,255,0.9)",
              lineHeight: 1.5,
              display: "flex",
            }}
          >
            {excerpt}
          </div>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 36,
            left: 72,
            fontSize: 20,
            color: "rgba(255,255,255,0.7)",
            display: "flex",
          }}
        >
          {authorName}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 24,
            right: 36,
            fontSize: 16,
            color: "rgba(255,255,255,0.5)",
            display: "flex",
          }}
        >
          genbacareer.jp
        </div>
      </div>
    ),
    { ...size }
  )
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + "…"
}
