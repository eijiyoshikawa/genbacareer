"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Save, Plus, Trash2, Download, GraduationCap, Briefcase, Award, FileText, PenLine } from "lucide-react"

const CONSTRUCTION_LICENSES = [
  "1級建築施工管理技士",
  "2級建築施工管理技士",
  "1級土木施工管理技士",
  "2級土木施工管理技士",
  "1級電気工事施工管理技士",
  "2級電気工事施工管理技士",
  "1級管工事施工管理技士",
  "第一種電気工事士",
  "第二種電気工事士",
  "玉掛け技能講習",
  "足場の組立て等作業主任者",
  "クレーン運転士",
  "移動式クレーン運転士",
  "車両系建設機械運転技能講習",
  "高所作業車運転技能講習",
  "フォークリフト運転技能講習",
  "酸素欠乏・硫化水素危険作業主任者",
  "有機溶剤作業主任者",
  "宅地建物取引士",
  "測量士",
  "測量士補",
  "建築士（1級）",
  "建築士（2級）",
  "普通自動車免許",
  "中型自動車免許",
  "大型自動車免許",
  "大型特殊自動車免許",
]

type HistoryEntry = { year: string; month: string; content: string }
type LicenseEntry = { year: string; month: string; name: string }
type CareerEntry = { company: string; period: string; position: string; description: string }

interface ResumeData {
  fullName: string
  furigana: string
  birthDate: string
  gender: string
  postalCode: string
  address: string
  phone: string
  email: string
  educationHistory: HistoryEntry[]
  workHistory: HistoryEntry[]
  licenses: LicenseEntry[]
  motivation: string
  selfPr: string
  careerSummary: string
  careerDetails: CareerEntry[]
  skills: string[]
  qualifications: string[]
}

export function ResumeBuilder({ initialData }: { initialData: ResumeData }) {
  const router = useRouter()
  const [data, setData] = useState<ResumeData>(initialData)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [activeTab, setActiveTab] = useState<"resume" | "career">("resume")

  const updateField = (field: keyof ResumeData, value: unknown) => {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch("/api/users/me/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (res.ok) {
        setMessage("保存しました")
        router.refresh()
      } else {
        setMessage("保存に失敗しました")
      }
    } catch {
      setMessage("エラーが発生しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Sub tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("resume")}
          className={`flex items-center gap-1.5  px-4 py-2 text-sm font-medium transition ${
            activeTab === "resume"
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          履歴書
        </button>
        <button
          onClick={() => setActiveTab("career")}
          className={`flex items-center gap-1.5  px-4 py-2 text-sm font-medium transition ${
            activeTab === "career"
              ? "bg-primary-600 text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          職務経歴書
        </button>
      </div>

      {activeTab === "resume" ? (
        <div className="space-y-8">
          {/* 基本情報 */}
          <Section title="基本情報" icon={<PenLine className="h-4 w-4" />}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="氏名" value={data.fullName} onChange={(v) => updateField("fullName", v)} />
              <Input label="ふりがな" value={data.furigana} onChange={(v) => updateField("furigana", v)} />
              <Input label="生年月日" type="date" value={data.birthDate} onChange={(v) => updateField("birthDate", v)} />
              <div>
                <label className="block text-xs font-medium text-gray-600">性別</label>
                <select
                  value={data.gender}
                  onChange={(e) => updateField("gender", e.target.value)}
                  className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">選択してください</option>
                  <option value="male">男性</option>
                  <option value="female">女性</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <Input label="郵便番号" value={data.postalCode} onChange={(v) => updateField("postalCode", v)} placeholder="123-4567" />
              <Input label="住所" value={data.address} onChange={(v) => updateField("address", v)} className="sm:col-span-2" />
              <Input label="電話番号" value={data.phone} onChange={(v) => updateField("phone", v)} />
              <Input label="メールアドレス" type="email" value={data.email} onChange={(v) => updateField("email", v)} />
            </div>
          </Section>

          {/* 学歴 */}
          <Section title="学歴" icon={<GraduationCap className="h-4 w-4" />}>
            <HistoryList
              entries={data.educationHistory}
              onChange={(v) => updateField("educationHistory", v)}
              placeholder="○○高等学校 卒業"
            />
          </Section>

          {/* 職歴 */}
          <Section title="職歴" icon={<Briefcase className="h-4 w-4" />}>
            <HistoryList
              entries={data.workHistory}
              onChange={(v) => updateField("workHistory", v)}
              placeholder="株式会社○○ 入社"
            />
          </Section>

          {/* 免許・資格 */}
          <Section title="免許・資格" icon={<Award className="h-4 w-4" />}>
            <LicenseList
              entries={data.licenses}
              onChange={(v) => updateField("licenses", v)}
            />
          </Section>

          {/* 志望動機 */}
          <Section title="志望動機">
            <textarea
              value={data.motivation}
              onChange={(e) => updateField("motivation", e.target.value)}
              rows={4}
              className="w-full border border-gray-300 px-3 py-2 text-sm"
              placeholder="志望動機を入力してください"
            />
          </Section>

          {/* 自己PR */}
          <Section title="自己PR">
            <textarea
              value={data.selfPr}
              onChange={(e) => updateField("selfPr", e.target.value)}
              rows={4}
              className="w-full border border-gray-300 px-3 py-2 text-sm"
              placeholder="自己PRを入力してください"
            />
          </Section>
        </div>
      ) : (
        <div className="space-y-8">
          {/* 職務要約 */}
          <Section title="職務要約">
            <textarea
              value={data.careerSummary}
              onChange={(e) => updateField("careerSummary", e.target.value)}
              rows={3}
              className="w-full border border-gray-300 px-3 py-2 text-sm"
              placeholder="これまでの職務経歴を簡潔にまとめてください"
            />
          </Section>

          {/* 職務経歴詳細 */}
          <Section title="職務経歴" icon={<Briefcase className="h-4 w-4" />}>
            <CareerDetailList
              entries={data.careerDetails}
              onChange={(v) => updateField("careerDetails", v)}
            />
          </Section>

          {/* 保有スキル */}
          <Section title="保有スキル">
            <TagInput
              tags={data.skills}
              onChange={(v) => updateField("skills", v)}
              placeholder="スキルを入力してEnter"
            />
          </Section>

          {/* 保有資格 */}
          <Section title="保有資格">
            <TagInput
              tags={data.qualifications}
              onChange={(v) => updateField("qualifications", v)}
              placeholder="資格名を入力してEnter"
              suggestions={CONSTRUCTION_LICENSES}
            />
          </Section>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t pt-6">
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700 transition disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {saving ? "保存中..." : "保存する"}
          </button>
          <a
            href="/api/users/me/resume/pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <Download className="h-4 w-4" />
            PDF出力
          </a>
        </div>
        {message && (
          <p className={`text-sm ${message.includes("失敗") || message.includes("エラー") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </p>
        )}
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="border bg-white p-5">
      <h3 className="flex items-center gap-1.5 text-base font-bold text-gray-900 mb-4">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  )
}

function Input({
  label, value, onChange, type = "text", placeholder, className = "",
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-gray-600">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  )
}

function HistoryList({
  entries, onChange, placeholder,
}: {
  entries: HistoryEntry[]; onChange: (v: HistoryEntry[]) => void; placeholder: string
}) {
  const add = () => onChange([...entries, { year: "", month: "", content: "" }])
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof HistoryEntry, value: string) => {
    const next = [...entries]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-2">
          <input type="number" value={entry.year} onChange={(e) => update(i, "year", e.target.value)} placeholder="年" className="w-20 border border-gray-300 px-2 py-1.5 text-sm" />
          <input type="number" value={entry.month} onChange={(e) => update(i, "month", e.target.value)} placeholder="月" className="w-16 border border-gray-300 px-2 py-1.5 text-sm" />
          <input value={entry.content} onChange={(e) => update(i, "content", e.target.value)} placeholder={placeholder} className="flex-1 border border-gray-300 px-2 py-1.5 text-sm" />
          <button onClick={() => remove(i)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
        <Plus className="h-4 w-4" /> 追加
      </button>
    </div>
  )
}

function LicenseList({ entries, onChange }: { entries: LicenseEntry[]; onChange: (v: LicenseEntry[]) => void }) {
  const add = () => onChange([...entries, { year: "", month: "", name: "" }])
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof LicenseEntry, value: string) => {
    const next = [...entries]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-2">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-2">
          <input type="number" value={entry.year} onChange={(e) => update(i, "year", e.target.value)} placeholder="年" className="w-20 border border-gray-300 px-2 py-1.5 text-sm" />
          <input type="number" value={entry.month} onChange={(e) => update(i, "month", e.target.value)} placeholder="月" className="w-16 border border-gray-300 px-2 py-1.5 text-sm" />
          <div className="flex-1 relative">
            <input
              value={entry.name}
              onChange={(e) => update(i, "name", e.target.value)}
              list={`license-suggestions-${i}`}
              placeholder="資格名"
              className="w-full border border-gray-300 px-2 py-1.5 text-sm"
            />
            <datalist id={`license-suggestions-${i}`}>
              {CONSTRUCTION_LICENSES.map((l) => <option key={l} value={l} />)}
            </datalist>
          </div>
          <button onClick={() => remove(i)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
        <Plus className="h-4 w-4" /> 追加
      </button>
    </div>
  )
}

function CareerDetailList({ entries, onChange }: { entries: CareerEntry[]; onChange: (v: CareerEntry[]) => void }) {
  const add = () => onChange([...entries, { company: "", period: "", position: "", description: "" }])
  const remove = (i: number) => onChange(entries.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof CareerEntry, value: string) => {
    const next = [...entries]
    next[i] = { ...next[i], [field]: value }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      {entries.map((entry, i) => (
        <div key={i} className="border p-4 space-y-2 relative">
          <button onClick={() => remove(i)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
          <div className="grid gap-2 sm:grid-cols-2">
            <input value={entry.company} onChange={(e) => update(i, "company", e.target.value)} placeholder="会社名" className="border border-gray-300 px-2 py-1.5 text-sm" />
            <input value={entry.period} onChange={(e) => update(i, "period", e.target.value)} placeholder="在籍期間（例: 2020年4月〜2024年3月）" className="border border-gray-300 px-2 py-1.5 text-sm" />
          </div>
          <input value={entry.position} onChange={(e) => update(i, "position", e.target.value)} placeholder="役職・ポジション" className="w-full border border-gray-300 px-2 py-1.5 text-sm" />
          <textarea value={entry.description} onChange={(e) => update(i, "description", e.target.value)} placeholder="業務内容" rows={3} className="w-full border border-gray-300 px-2 py-1.5 text-sm" />
        </div>
      ))}
      <button onClick={add} className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700">
        <Plus className="h-4 w-4" /> 職歴を追加
      </button>
    </div>
  )
}

function TagInput({ tags, onChange, placeholder, suggestions }: {
  tags: string[]; onChange: (v: string[]) => void; placeholder: string; suggestions?: string[]
}) {
  const [input, setInput] = useState("")

  const add = () => {
    const trimmed = input.trim()
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed])
      setInput("")
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700">
            {tag}
            <button onClick={() => onChange(tags.filter((t) => t !== tag))} className="text-primary-400 hover:text-primary-600">&times;</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
          list={suggestions ? "tag-suggestions" : undefined}
          placeholder={placeholder}
          className="flex-1 border border-gray-300 px-3 py-2 text-sm"
        />
        <button onClick={add} className="bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200">追加</button>
      </div>
      {suggestions && (
        <datalist id="tag-suggestions">
          {suggestions.map((s) => <option key={s} value={s} />)}
        </datalist>
      )}
    </div>
  )
}
