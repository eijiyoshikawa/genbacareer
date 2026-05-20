/**
 * 求人の印刷 / PDF 用ページ。
 *
 * /jobs/[id]/print
 * - 印刷専用の最小レイアウト
 * - 「ゲンバキャリア」のウォーターマークを薄く配置
 * - ブラウザの「PDF として保存」で日本語対応 PDF を生成
 *
 * 日本語フォントをサーバ側でレンダリングする外部ライブラリ（pdfkit / pdf-lib）は
 * フォントバンドルが必要で Vercel での扱いが重いため、ブラウザ印刷でフォールバック。
 */

import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Image from "next/image"
import { getCategoryLabel } from "@/lib/categories"
import { PrintTrigger } from "./print-trigger"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "求人 PDF",
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ auto?: string }>
}

export default async function JobPrintPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const auto = sp.auto === "1"

  const job = await prisma.job
    .findUnique({
      where: { id },
      include: {
        company: {
          select: {
            name: true,
            logoUrl: true,
            websiteUrl: true,
            address: true,
            prefecture: true,
            city: true,
          },
        },
      },
    })
    .catch(() => null)

  if (!job) notFound()

  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryType)
  const generatedAt = new Date().toLocaleString("ja-JP")

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{job.title} | ゲンバキャリア</title>
        <style>{PRINT_CSS}</style>
      </head>
      <body>
        {auto && <PrintTrigger />}

        <div className="watermark" aria-hidden>
          <div className="wm-text">ゲンバキャリア</div>
          <div className="wm-text">ゲンバキャリア</div>
          <div className="wm-text">ゲンバキャリア</div>
          <div className="wm-text">ゲンバキャリア</div>
          <div className="wm-text">ゲンバキャリア</div>
          <div className="wm-text">ゲンバキャリア</div>
        </div>

        <main className="page">
          <header className="hdr">
            <div className="brand">
              <span className="brand-mark">ゲンバキャリア</span>
              <span className="brand-tag">建設業特化 求人ポータル</span>
            </div>
            {job.company?.logoUrl && (
              <div className="logo">
                <Image
                  src={job.company.logoUrl}
                  alt={`${job.company.name} ロゴ`}
                  width={80}
                  height={80}
                  unoptimized
                />
              </div>
            )}
          </header>

          <h1 className="title">{job.title}</h1>
          {job.company?.name && <p className="co">{job.company.name}</p>}

          <section className="grid">
            <Field label="職種">{getCategoryLabel(job.category)}</Field>
            <Field label="雇用形態">{employmentLabel(job.employmentType)}</Field>
            <Field label="給与">{salary}</Field>
            <Field label="勤務地">
              {job.prefecture}
              {job.city ? ` ${job.city}` : ""}
              {job.address ? ` ${job.address}` : ""}
            </Field>
            <Field label="勤務時間">{job.workHours ?? "—"}</Field>
            <Field label="年間休日">
              {job.annualHolidays != null ? `${job.annualHolidays} 日` : "—"}
            </Field>
            <Field label="社会保険">{job.insurance ?? "—"}</Field>
            <Field label="出典">
              {job.source === "direct" ? "認定企業" : "公共求人"}
            </Field>
          </section>

          {job.description && (
            <section className="block">
              <h2>仕事内容</h2>
              <p className="pre">{job.description}</p>
            </section>
          )}

          {job.requirements && (
            <section className="block">
              <h2>応募要件</h2>
              <p className="pre">{job.requirements}</p>
            </section>
          )}

          {job.benefits.length > 0 && (
            <section className="block">
              <h2>福利厚生</h2>
              <ul className="chips">
                {job.benefits.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            </section>
          )}

          {job.tags.length > 0 && (
            <section className="block">
              <h2>特徴タグ</h2>
              <ul className="chips">
                {job.tags.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}

          <footer className="ftr">
            <p>
              この求人情報は ゲンバキャリア（genbacareer.jp）で生成されました。
            </p>
            <p>生成日時: {generatedAt}</p>
            <p>
              求人 URL:{" "}
              {`https://www.genbacareer.jp/jobs/${job.id}`}
            </p>
            {job.company?.websiteUrl && (
              <p>企業サイト: {job.company.websiteUrl}</p>
            )}
          </footer>
        </main>
      </body>
    </html>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  if (!min && !max) return "応相談"
  const unit =
    type === "hourly"
      ? "時給"
      : type === "annual"
        ? "年収"
        : type === "daily"
          ? "日給"
          : "月給"
  const fmt = (n: number) =>
    type !== "hourly" && type !== "daily" && n >= 10000
      ? `${(n / 10000).toFixed(0)}万`
      : n.toLocaleString()
  if (min && max) return `${unit} ${fmt(min)} 〜 ${fmt(max)} 円`
  if (min) return `${unit} ${fmt(min)} 円〜`
  return `${unit} 〜 ${fmt(max!)} 円`
}

function employmentLabel(t: string | null): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート",
    contract: "契約社員",
  }
  return t ? labels[t] ?? t : "—"
}

const PRINT_CSS = `
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Hiragino Sans", "Yu Gothic", "Meiryo", sans-serif;
  color: #1a1a1a;
  background: #fff;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}
body {
  position: relative;
}

/* ===== Watermark ===== */
.watermark {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  align-content: space-around;
  justify-items: center;
  align-items: center;
  overflow: hidden;
}
.wm-text {
  font-size: 56px;
  font-weight: 900;
  color: rgba(22, 163, 74, 0.07);
  letter-spacing: 0.1em;
  transform: rotate(-30deg);
  user-select: none;
}

/* ===== Page ===== */
.page {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 36px;
}
.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border-bottom: 2px solid #16a34a;
  padding-bottom: 12px;
  margin-bottom: 18px;
}
.brand-mark {
  display: block;
  font-size: 18px;
  font-weight: 900;
  color: #166534;
  letter-spacing: 0.05em;
}
.brand-tag {
  display: block;
  font-size: 11px;
  color: #666;
  margin-top: 2px;
}
.logo {
  width: 64px;
  height: 64px;
  border: 1px solid #ddd;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}
.title {
  font-size: 22px;
  font-weight: 800;
  margin: 0 0 4px;
  color: #111;
  line-height: 1.3;
}
.co {
  margin: 0 0 18px;
  font-size: 13px;
  color: #555;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px 16px;
  border: 1px solid #e5e5e5;
  padding: 12px 14px;
  margin: 0 0 16px;
  background: rgba(255, 255, 255, 0.92);
}
.field {
  margin: 0;
}
.field dt {
  font-size: 10px;
  font-weight: 700;
  color: #888;
  margin-bottom: 2px;
}
.field dd {
  margin: 0;
  font-size: 13px;
  color: #111;
}
.block {
  margin: 14px 0;
  background: rgba(255, 255, 255, 0.92);
}
.block h2 {
  font-size: 13px;
  font-weight: 800;
  margin: 0 0 6px;
  padding-left: 8px;
  border-left: 4px solid #16a34a;
  color: #111;
}
.pre {
  white-space: pre-wrap;
  font-size: 12px;
  line-height: 1.75;
  margin: 0;
  color: #222;
}
.chips {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.chips li {
  border: 1px solid #c7e8d4;
  background: #f0fdf4;
  color: #166534;
  font-size: 11px;
  padding: 2px 8px;
}
.ftr {
  margin-top: 32px;
  padding-top: 12px;
  border-top: 1px solid #ddd;
  font-size: 10px;
  color: #888;
  line-height: 1.6;
}

@media print {
  @page {
    margin: 14mm;
    size: A4;
  }
  .page {
    padding: 0;
    max-width: none;
  }
  .grid, .block {
    page-break-inside: avoid;
  }
}
`
