/**
 * LINE Flex Message ビルダ。
 *
 * admin の単発 push / セグメント配信 / LIFF 完了画面など、
 * 求人をリッチカード形式で送る場面で共通利用する。
 *
 * Flex の仕様: https://developers.line.biz/flex-simulator/
 */

import type {
  FlexBubble,
  FlexCarousel,
  FlexMessage,
  FlexBox,
  FlexComponent,
} from "./line-messaging"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

export interface JobForCard {
  id: string
  title: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  category?: string | null
  tags?: string[]
  imageUrl?: string | null
}

const FALLBACK_HERO_BY_CATEGORY: Record<string, string> = {
  construction:
    "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=75",
  civil:
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=75",
  electrical:
    "https://images.unsplash.com/photo-1605152276897-4f618f831968?auto=format&fit=crop&w=800&q=75",
  interior:
    "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=75",
  demolition:
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=75",
  driver:
    "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=75",
  management:
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=75",
  survey:
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=75",
}

const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=75"

function pickHero(job: JobForCard): string {
  if (job.imageUrl) return job.imageUrl
  if (job.category && FALLBACK_HERO_BY_CATEGORY[job.category]) {
    return FALLBACK_HERO_BY_CATEGORY[job.category]
  }
  return DEFAULT_HERO
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  if (!min) return "応相談"
  const unit = type === "hourly" ? "時給" : type === "annual" ? "年収" : "月給"
  const fmt = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(0)}万` : `${n.toLocaleString()}`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  return `${unit} ${fmt(min)}円〜`
}

/** 単一求人のバブル（カード）を作る。 */
export function buildJobBubble(job: JobForCard): FlexBubble {
  const location = `${job.prefecture}${job.city ? ` ${job.city}` : ""}`
  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryType)
  const url = `${SITE_URL}/jobs/${job.id}`

  const bodyContents: FlexComponent[] = [
    {
      type: "text",
      text: job.title,
      weight: "bold",
      size: "md",
      wrap: true,
      color: "#1F2937",
    },
    {
      type: "box",
      layout: "baseline",
      margin: "md",
      contents: [
        { type: "text", text: "📍", size: "sm" },
        { type: "text", text: location, size: "sm", color: "#6B7280", wrap: true, margin: "xs" },
      ],
    },
    {
      type: "box",
      layout: "baseline",
      contents: [
        { type: "text", text: "💰", size: "sm" },
        { type: "text", text: salary, size: "sm", color: "#E25C0E", weight: "bold", margin: "xs", wrap: true },
      ],
    },
  ]

  if (job.tags && job.tags.length > 0) {
    bodyContents.push({
      type: "text",
      text: job.tags.slice(0, 3).map((t) => `#${t}`).join("  "),
      size: "xs",
      color: "#9CA3AF",
      margin: "md",
      wrap: true,
    })
  }

  const body: FlexBox = {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: bodyContents,
  }

  const footer: FlexBox = {
    type: "box",
    layout: "vertical",
    spacing: "sm",
    contents: [
      {
        type: "button",
        action: { type: "uri", label: "詳しく見る", uri: url },
        style: "primary",
        color: "#F37524",
        height: "sm",
      },
    ],
  }

  return {
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url: pickHero(job),
      size: "full",
      aspectMode: "cover",
      aspectRatio: "20:13",
      action: { type: "uri", uri: url, label: job.title },
    },
    body,
    footer,
  }
}

/** 複数求人のカルーセル（最大 12 件）。 */
export function buildJobCarousel(jobs: JobForCard[]): FlexCarousel {
  return {
    type: "carousel",
    contents: jobs.slice(0, 12).map(buildJobBubble),
  }
}

/**
 * 配信用の完成形 Flex Message。
 * altText は通知バーと iOS の一覧表示に出る短いテキスト。
 */
export function buildJobRecommendationFlex({
  jobs,
  altTextPrefix = "おすすめ求人",
}: {
  jobs: JobForCard[]
  altTextPrefix?: string
}): FlexMessage {
  const altText =
    jobs.length === 1
      ? `${altTextPrefix}: ${jobs[0].title}`
      : `${altTextPrefix} ${jobs.length} 件 (${jobs.map((j) => j.title.slice(0, 16)).join(" / ").slice(0, 60)}…)`
  return {
    type: "flex",
    altText: altText.slice(0, 400),
    contents:
      jobs.length === 1 ? buildJobBubble(jobs[0]) : buildJobCarousel(jobs),
  }
}
