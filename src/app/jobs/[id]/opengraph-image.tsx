import { ImageResponse } from "next/og"
import { prisma } from "@/lib/db"

export const alt = "求人詳細"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const job = await prisma.job
    .findUnique({
      where: { id },
      select: {
        title: true,
        prefecture: true,
        city: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        employmentType: true,
        company: { select: { name: true } },
      },
    })
    .catch(() => null)

  const title = truncate(job?.title ?? "求人情報", 60)
  const companyName = truncate(job?.company?.name ?? "", 30)
  const location = [job?.prefecture, job?.city].filter(Boolean).join(" ") || ""
  const salary = formatSalary(
    job?.salaryMin ?? null,
    job?.salaryMax ?? null,
    job?.salaryType ?? null
  )
  const employmentLabel = formatEmploymentType(job?.employmentType ?? null)

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)",
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
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 260,
            height: 260,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
          }}
        />

        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.7)",
            marginBottom: 16,
            display: "flex",
          }}
        >
          ゲンバキャリア・求人情報
        </div>

        <div
          style={{
            fontSize: 56,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 28,
            display: "flex",
          }}
        >
          {title}
        </div>

        {companyName && (
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.9)",
              marginBottom: 36,
              display: "flex",
            }}
          >
            {companyName}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginTop: "auto",
          }}
        >
          {location && <Tag>{location}</Tag>}
          {employmentLabel && <Tag>{employmentLabel}</Tag>}
          {salary && <Tag>{salary}</Tag>}
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

function Tag({ children }: { children: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.15)",
        border: "1px solid rgba(255,255,255,0.3)",
        borderRadius: 999,
        padding: "10px 22px",
        fontSize: 24,
        color: "white",
        display: "flex",
      }}
    >
      {children}
    </div>
  )
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max - 1) + "…"
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  if (min == null && max == null) return ""
  const unit =
    type === "hourly"
      ? "円/時"
      : type === "annual"
        ? "円/年"
        : type === "daily"
          ? "円/日"
          : "円/月"
  const fmt = (v: number) => v.toLocaleString("ja-JP")
  if (min != null && max != null) return `${fmt(min)}〜${fmt(max)}${unit}`
  if (min != null) return `${fmt(min)}${unit}〜`
  if (max != null) return `〜${fmt(max)}${unit}`
  return ""
}

function formatEmploymentType(t: string | null): string {
  switch (t) {
    case "full_time":
      return "正社員"
    case "part_time":
      return "パート・アルバイト"
    case "contract":
      return "契約社員"
    default:
      return ""
  }
}
