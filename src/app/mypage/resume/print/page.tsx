/**
 * 履歴書・職務経歴書の印刷 / PDF 用ページ。
 *
 * /mypage/resume/print
 * - 履歴書（学歴・職歴・免許・志望動機・自己 PR）と職務経歴書（要約・詳細・スキル）を縦並びで出力
 * - 「ゲンバキャリア」のウォーターマークを薄く配置
 * - ブラウザの「PDF として保存」で出力 → 日本語フォント完全対応
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { PrintTrigger } from "./print-trigger"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "履歴書・職務経歴書 PDF",
  robots: { index: false, follow: false },
}

type HistoryEntry = { year?: string; month?: string; content?: string }
type LicenseEntry = { year?: string; month?: string; name?: string }
type CareerEntry = {
  company?: string
  period?: string
  position?: string
  description?: string
}

type Props = {
  searchParams?: Promise<{ auto?: string }>
}

export default async function ResumePrintPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/mypage/resume/print")
  const sp = (await searchParams) ?? {}
  const auto = sp.auto === "1"

  const resume = await prisma.resume
    .findUnique({ where: { userId: session.user.id } })
    .catch(() => null)

  const educationHistory = parseHistory(resume?.educationHistory)
  const workHistory = parseHistory(resume?.workHistory)
  const licenses = parseLicenses(resume?.licenses)
  const careerDetails = parseCareer(resume?.careerDetails)

  const generatedAt = new Date().toLocaleString("ja-JP")

  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>履歴書・職務経歴書 | ゲンバキャリア</title>
        <style>{PRINT_CSS}</style>
      </head>
      <body>
        {auto && <PrintTrigger />}

        <div className="watermark" aria-hidden>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="wm-text">
              ゲンバキャリア
            </div>
          ))}
        </div>

        {/* 履歴書 */}
        <main className="page">
          <header className="hdr">
            <div className="brand">
              <span className="brand-mark">ゲンバキャリア</span>
              <span className="brand-tag">建設業特化 ゲンバキャリア</span>
            </div>
            <div className="doc-title">履歴書</div>
            <div className="gen">{generatedAt}</div>
          </header>

          <section className="basics">
            <div className="basics-l">
              <Row label="氏名" value={resume?.fullName ?? ""} big />
              <Row label="ふりがな" value={resume?.furigana ?? ""} />
              <Row
                label="生年月日"
                value={
                  resume?.birthDate
                    ? new Date(resume.birthDate).toLocaleDateString("ja-JP")
                    : ""
                }
              />
              <Row label="性別" value={resume?.gender ?? ""} />
              <Row label="郵便番号" value={resume?.postalCode ?? ""} />
              <Row label="住所" value={resume?.address ?? ""} />
              <Row label="電話" value={resume?.phone ?? ""} />
              <Row label="メール" value={resume?.email ?? ""} />
            </div>
          </section>

          <section className="block">
            <h2>学歴</h2>
            {educationHistory.length === 0 ? (
              <p className="empty">—</p>
            ) : (
              <table className="hist">
                <tbody>
                  {educationHistory.map((h, i) => (
                    <tr key={i}>
                      <td className="hist-date">
                        {h.year ? `${h.year} 年` : ""}
                        {h.month ? ` ${h.month} 月` : ""}
                      </td>
                      <td>{h.content ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="block">
            <h2>職歴</h2>
            {workHistory.length === 0 ? (
              <p className="empty">—</p>
            ) : (
              <table className="hist">
                <tbody>
                  {workHistory.map((h, i) => (
                    <tr key={i}>
                      <td className="hist-date">
                        {h.year ? `${h.year} 年` : ""}
                        {h.month ? ` ${h.month} 月` : ""}
                      </td>
                      <td>{h.content ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="block">
            <h2>免許・資格</h2>
            {licenses.length === 0 ? (
              <p className="empty">—</p>
            ) : (
              <table className="hist">
                <tbody>
                  {licenses.map((l, i) => (
                    <tr key={i}>
                      <td className="hist-date">
                        {l.year ? `${l.year} 年` : ""}
                        {l.month ? ` ${l.month} 月` : ""}
                      </td>
                      <td>{l.name ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          {resume?.motivation && (
            <section className="block">
              <h2>志望動機</h2>
              <p className="pre">{resume.motivation}</p>
            </section>
          )}

          {resume?.selfPr && (
            <section className="block">
              <h2>自己 PR</h2>
              <p className="pre">{resume.selfPr}</p>
            </section>
          )}
        </main>

        {/* 職務経歴書 */}
        <main className="page page-break">
          <header className="hdr">
            <div className="brand">
              <span className="brand-mark">ゲンバキャリア</span>
              <span className="brand-tag">建設業特化 ゲンバキャリア</span>
            </div>
            <div className="doc-title">職務経歴書</div>
            <div className="gen">{generatedAt}</div>
          </header>

          <p className="cv-name">
            {resume?.fullName ?? ""} {resume?.furigana ? `（${resume.furigana}）` : ""}
          </p>

          {resume?.careerSummary && (
            <section className="block">
              <h2>職務要約</h2>
              <p className="pre">{resume.careerSummary}</p>
            </section>
          )}

          {careerDetails.length > 0 && (
            <section className="block">
              <h2>職務経歴</h2>
              <div className="career">
                {careerDetails.map((c, i) => (
                  <article key={i} className="career-item">
                    <p className="career-co">
                      <strong>{c.company ?? ""}</strong>
                      {c.period && <span className="career-period">（{c.period}）</span>}
                    </p>
                    {c.position && (
                      <p className="career-pos">役職: {c.position}</p>
                    )}
                    {c.description && <p className="pre">{c.description}</p>}
                  </article>
                ))}
              </div>
            </section>
          )}

          {resume?.skills && resume.skills.length > 0 && (
            <section className="block">
              <h2>保有スキル</h2>
              <ul className="chips">
                {resume.skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}

          {resume?.qualifications && resume.qualifications.length > 0 && (
            <section className="block">
              <h2>資格一覧</h2>
              <ul className="chips">
                {resume.qualifications.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </section>
          )}

          <footer className="ftr">
            <p>
              この履歴書・職務経歴書は ゲンバキャリア（genbacareer.jp）の入力内容から
              生成されました。生成日時: {generatedAt}
            </p>
          </footer>
        </main>
      </body>
    </html>
  )
}

function Row({
  label,
  value,
  big,
}: {
  label: string
  value: string
  big?: boolean
}) {
  return (
    <div className="row">
      <span className="row-label">{label}</span>
      <span className={`row-value ${big ? "row-big" : ""}`}>{value || "—"}</span>
    </div>
  )
}

function parseHistory(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      year: typeof x.year === "string" || typeof x.year === "number" ? String(x.year) : undefined,
      month:
        typeof x.month === "string" || typeof x.month === "number"
          ? String(x.month)
          : undefined,
      content: typeof x.content === "string" ? x.content : undefined,
    }))
}

function parseLicenses(raw: unknown): LicenseEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      year: typeof x.year === "string" || typeof x.year === "number" ? String(x.year) : undefined,
      month:
        typeof x.month === "string" || typeof x.month === "number"
          ? String(x.month)
          : undefined,
      name: typeof x.name === "string" ? x.name : undefined,
    }))
}

function parseCareer(raw: unknown): CareerEntry[] {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({
      company: typeof x.company === "string" ? x.company : undefined,
      period: typeof x.period === "string" ? x.period : undefined,
      position: typeof x.position === "string" ? x.position : undefined,
      description: typeof x.description === "string" ? x.description : undefined,
    }))
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
body { position: relative; }

.watermark {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  align-content: space-around;
  justify-items: center;
  align-items: center;
  overflow: hidden;
}
.wm-text {
  font-size: 42px;
  font-weight: 900;
  color: rgba(22, 163, 74, 0.06);
  letter-spacing: 0.1em;
  transform: rotate(-30deg);
  user-select: none;
}

.page {
  position: relative;
  z-index: 1;
  max-width: 720px;
  margin: 0 auto;
  padding: 28px 36px;
  page-break-after: always;
}
.page:last-child { page-break-after: auto; }
.page-break { page-break-before: always; }

.hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 2px solid #16a34a;
  padding-bottom: 10px;
  margin-bottom: 16px;
}
.brand-mark {
  display: block;
  font-size: 14px;
  font-weight: 900;
  color: #166534;
  letter-spacing: 0.05em;
}
.brand-tag {
  display: block;
  font-size: 10px;
  color: #666;
  margin-top: 2px;
}
.doc-title {
  font-size: 24px;
  font-weight: 900;
  color: #111;
  letter-spacing: 0.3em;
}
.gen {
  font-size: 10px;
  color: #888;
}

.basics {
  border: 1px solid #e5e5e5;
  padding: 12px 14px;
  margin: 0 0 14px;
  background: rgba(255, 255, 255, 0.93);
}
.row {
  display: grid;
  grid-template-columns: 80px 1fr;
  gap: 8px;
  padding: 4px 0;
  border-bottom: 1px dashed #eee;
  font-size: 12px;
}
.row:last-child { border-bottom: none; }
.row-label {
  font-size: 10px;
  font-weight: 700;
  color: #888;
  padding-top: 2px;
}
.row-value { color: #111; }
.row-big { font-size: 16px; font-weight: 700; }

.block {
  margin: 12px 0;
  background: rgba(255, 255, 255, 0.93);
}
.block h2 {
  font-size: 12px;
  font-weight: 800;
  margin: 0 0 6px;
  padding-left: 8px;
  border-left: 4px solid #16a34a;
  color: #111;
}
.empty { color: #aaa; font-size: 11px; margin: 0; }
.pre { white-space: pre-wrap; font-size: 11px; line-height: 1.75; margin: 0; color: #222; }

.hist {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
}
.hist td {
  padding: 4px 6px;
  vertical-align: top;
  border-bottom: 1px dotted #eee;
}
.hist-date {
  width: 110px;
  color: #555;
  white-space: nowrap;
}

.chips { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 4px; }
.chips li {
  border: 1px solid #c7e8d4;
  background: #f0fdf4;
  color: #166534;
  font-size: 11px;
  padding: 2px 8px;
}

.cv-name { font-size: 14px; font-weight: 800; color: #222; margin: 0 0 8px; }
.career-item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dotted #eee; }
.career-item:last-child { border-bottom: none; }
.career-co { font-size: 12px; margin: 0 0 2px; color: #111; }
.career-period { color: #666; font-weight: 400; font-size: 11px; margin-left: 6px; }
.career-pos { font-size: 11px; color: #555; margin: 0 0 4px; }

.ftr {
  margin-top: 24px;
  padding-top: 8px;
  border-top: 1px solid #ddd;
  font-size: 9px;
  color: #888;
}

@media print {
  @page { margin: 14mm; size: A4; }
  .page { padding: 0; max-width: none; }
  .block, .career-item, .basics { page-break-inside: avoid; }
}
`
