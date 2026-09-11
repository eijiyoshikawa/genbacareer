import { ImageResponse } from "next/og"
import { prisma } from "@/lib/db"
import { isValidUuid } from "@/lib/uuid"
import { sanitizeOgText } from "@/lib/og-text"

export const alt = "企業情報"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function OGImage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const company = isValidUuid(id)
    ? await prisma.company
        .findUnique({
          where: { id },
          select: {
            name: true,
            tagline: true,
            industry: true,
            prefecture: true,
            employeeCount: true,
          },
        })
        .catch(() => null)
    : null

  const name = sanitizeOgText(truncate(company?.name ?? "企業情報", 40))
  const tagline = sanitizeOgText(truncate(company?.tagline ?? "", 80))
  const meta = sanitizeOgText(
    [company?.industry, company?.prefecture].filter(Boolean).join(" ・ ")
  )

  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #15803d 0%, #16a34a 50%, #22c55e 100%)",
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
          ゲンバキャリア・企業情報
        </div>

        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: 28,
            display: "flex",
          }}
        >
          {name}
        </div>

        {tagline && (
          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.9)",
              lineHeight: 1.4,
              marginBottom: 24,
              display: "flex",
            }}
          >
            {tagline}
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
          {meta && <Tag>{meta}</Tag>}
          {company?.employeeCount && <Tag>{company.employeeCount}</Tag>}
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
