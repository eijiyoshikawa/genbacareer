/**
 * 履歴書・職務経歴書のHTMLを生成する。
 * ブラウザの印刷機能（Ctrl+P）でPDF化する想定。
 */

type HistoryEntry = { year: string; month: string; content: string }
type LicenseEntry = { year: string; month: string; name: string }
type CareerEntry = { company: string; period: string; position: string; description: string }

interface ResumeRecord {
  fullName: string | null
  furigana: string | null
  birthDate: Date | null
  gender: string | null
  postalCode: string | null
  address: string | null
  phone: string | null
  email: string | null
  educationHistory: unknown
  workHistory: unknown
  licenses: unknown
  motivation: string | null
  selfPr: string | null
  careerSummary: string | null
  careerDetails: unknown
  skills: string[]
  qualifications: string[]
}

function genderLabel(gender: string | null): string {
  if (gender === "male") return "男性"
  if (gender === "female") return "女性"
  if (gender === "other") return "その他"
  return ""
}

function esc(s: string | null | undefined): string {
  if (!s) return ""
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

export function generateResumeHtml(resume: ResumeRecord): string {
  const edu = (resume.educationHistory as HistoryEntry[] | null) ?? []
  const work = (resume.workHistory as HistoryEntry[] | null) ?? []
  const licenses = (resume.licenses as LicenseEntry[] | null) ?? []
  const career = (resume.careerDetails as CareerEntry[] | null) ?? []

  const historyRows = (entries: HistoryEntry[]) =>
    entries.map(e => `<tr><td class="date">${esc(e.year)}年${esc(e.month)}月</td><td>${esc(e.content)}</td></tr>`).join("")

  const licenseRows = licenses.map(l => `<tr><td class="date">${esc(l.year)}年${esc(l.month)}月</td><td>${esc(l.name)}</td></tr>`).join("")

  const careerBlocks = career.map(c => `
    <div class="career-block">
      <div class="career-company">${esc(c.company)}${c.position ? ` — ${esc(c.position)}` : ""}</div>
      <div class="career-period">${esc(c.period)}</div>
      <div class="career-desc">${esc(c.description)}</div>
    </div>
  `).join("")

  const tags = (items: string[]) =>
    items.map(s => `<span class="tag">${esc(s)}</span>`).join("")

  const birthStr = resume.birthDate ? new Date(resume.birthDate).toLocaleDateString("ja-JP") : ""

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>履歴書 — ${esc(resume.fullName)}</title>
<style>
  @page { size: A4; margin: 20mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif; font-size: 10pt; color: #1a1a1a; line-height: 1.6; }
  h1 { text-align: center; font-size: 18pt; margin-bottom: 16pt; letter-spacing: 8pt; }
  h2 { font-size: 12pt; border-bottom: 2px solid #2563eb; padding-bottom: 4pt; margin: 20pt 0 10pt; color: #1e40af; }
  .info-table { width: 100%; border-collapse: collapse; margin-bottom: 12pt; }
  .info-table td { padding: 4pt 8pt; vertical-align: top; }
  .info-table .label { width: 80pt; font-weight: bold; color: #6b7280; }
  table.history { width: 100%; border-collapse: collapse; }
  table.history td { padding: 3pt 8pt; vertical-align: top; }
  table.history .date { width: 70pt; color: #6b7280; white-space: nowrap; }
  .career-block { background: #f9fafb; border-radius: 4pt; padding: 8pt; margin-bottom: 8pt; }
  .career-company { font-weight: bold; font-size: 10pt; }
  .career-period { font-size: 8pt; color: #6b7280; margin-bottom: 4pt; }
  .career-desc { font-size: 9pt; white-space: pre-wrap; }
  .tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 2pt 8pt; border-radius: 3pt; font-size: 8pt; margin: 2pt 4pt 2pt 0; }
  .tags { margin-top: 6pt; }
  .footer { text-align: center; font-size: 7pt; color: #9ca3af; margin-top: 24pt; }
  .page-break { page-break-before: always; }
  p.text-block { white-space: pre-wrap; font-size: 10pt; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  @media screen { body { max-width: 210mm; margin: 20mm auto; padding: 20mm; background: white; box-shadow: 0 0 10px rgba(0,0,0,0.1); } }
</style>
<script>window.onload = () => window.print();</script>
</head>
<body>
<h1>履 歴 書</h1>

<table class="info-table">
  <tr><td class="label">氏名</td><td>${esc(resume.fullName)}</td></tr>
  <tr><td class="label">ふりがな</td><td>${esc(resume.furigana)}</td></tr>
  <tr><td class="label">生年月日</td><td>${birthStr}</td></tr>
  <tr><td class="label">性別</td><td>${genderLabel(resume.gender)}</td></tr>
  <tr><td class="label">住所</td><td>${resume.postalCode ? `〒${esc(resume.postalCode)} ` : ""}${esc(resume.address)}</td></tr>
  <tr><td class="label">電話</td><td>${esc(resume.phone)}</td></tr>
  <tr><td class="label">メール</td><td>${esc(resume.email)}</td></tr>
</table>

${edu.length > 0 ? `<h2>学歴</h2><table class="history">${historyRows(edu)}</table>` : ""}
${work.length > 0 ? `<h2>職歴</h2><table class="history">${historyRows(work)}</table>` : ""}
${licenses.length > 0 ? `<h2>免許・資格</h2><table class="history">${licenseRows}</table>` : ""}
${resume.motivation ? `<h2>志望動機</h2><p class="text-block">${esc(resume.motivation)}</p>` : ""}
${resume.selfPr ? `<h2>自己PR</h2><p class="text-block">${esc(resume.selfPr)}</p>` : ""}

${(resume.careerSummary || career.length > 0 || resume.skills.length > 0) ? `
<div class="page-break"></div>
<h1>職 務 経 歴 書</h1>
${resume.careerSummary ? `<h2>職務要約</h2><p class="text-block">${esc(resume.careerSummary)}</p>` : ""}
${career.length > 0 ? `<h2>職務経歴</h2>${careerBlocks}` : ""}
${resume.skills.length > 0 ? `<h2>保有スキル</h2><div class="tags">${tags(resume.skills)}</div>` : ""}
${resume.qualifications.length > 0 ? `<h2>保有資格</h2><div class="tags">${tags(resume.qualifications)}</div>` : ""}
` : ""}

<div class="footer">ゲンバキャリア</div>
</body>
</html>`
}
