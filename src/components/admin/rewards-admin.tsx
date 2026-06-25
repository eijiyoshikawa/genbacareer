"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const KIND_OPTIONS = [
  { value: "amazon_gift", label: "金券（Amazonギフト等）" },
  { value: "service_perk", label: "サービス内特典" },
  { value: "physical", label: "実物景品" },
  { value: "none", label: "ハズレ" },
]

async function postJson(url: string, body: unknown, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok && data.ok !== false, data }
}

/** 面談完了 → ポイント付与フォーム */
export function InterviewAwardForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [companyName, setCompanyName] = useState("")
  const [coordinator, setCoordinator] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setMsg(null)
    const { ok, data } = await postJson("/api/admin/career-interviews", {
      email,
      companyName,
      coordinator,
    })
    setBusy(false)
    if (ok) {
      setMsg(data.message ?? `付与しました（+${data.granted} pt）`)
      setEmail("")
      setCompanyName("")
      router.refresh()
    } else {
      setMsg(data.error ?? "エラーが発生しました")
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="font-bold text-gray-900">キャリア面談の完了を記録</h3>
      <p className="mt-1 text-xs text-gray-500">
        対象求職者のメールアドレスを入力すると面談完了として記録し、+50pt を付与します。
        ただし <strong>7 日に 1 回</strong>・<strong>同一企業では再付与しない</strong>制限があり、
        条件に該当する場合は記録のみでポイントは付与されません。
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-sm">
          <span className="block text-xs text-gray-500">メールアドレス</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seeker@example.com"
            className="mt-0.5 w-64 rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500">面談先の企業名（同一企業判定用）</span>
          <input
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="株式会社〇〇"
            className="mt-0.5 w-56 rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500">担当者（任意）</span>
          <input
            value={coordinator}
            onChange={(e) => setCoordinator(e.target.value)}
            className="mt-0.5 w-32 rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={submit}
          disabled={busy || !email}
          className="rounded bg-primary-600 px-3 py-1.5 text-sm font-bold text-white disabled:bg-gray-300"
        >
          記録する
        </button>
      </div>
      {msg && <p className="mt-2 text-sm text-gray-700">{msg}</p>}
    </div>
  )
}

/** 景品の新規作成フォーム */
export function PrizeCreateForm() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [kind, setKind] = useState("amazon_gift")
  const [valueJpy, setValueJpy] = useState("0")
  const [weight, setWeight] = useState("1")
  const [stock, setStock] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true)
    setMsg(null)
    const { ok, data } = await postJson("/api/admin/lottery-prizes", {
      name,
      kind,
      valueJpy: Number(valueJpy) || 0,
      weight: Number(weight) || 0,
      stock: stock === "" ? null : Number(stock),
    })
    setBusy(false)
    if (ok) {
      setName("")
      setMsg("追加しました")
      router.refresh()
    } else {
      setMsg(data.error ?? "エラーが発生しました")
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="font-bold text-gray-900">景品を追加</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-6">
        <label className="col-span-2 text-sm">
          <span className="block text-xs text-gray-500">景品名</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="col-span-2 text-sm">
          <span className="block text-xs text-gray-500">種別</span>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value)}
            className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
          >
            {KIND_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500">景品額(円)</span>
          <input
            type="number"
            value={valueJpy}
            onChange={(e) => setValueJpy(e.target.value)}
            className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500">重み</span>
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-xs text-gray-500">在庫(空=無制限)</span>
          <input
            type="number"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="mt-0.5 w-full rounded border px-2 py-1.5 text-sm"
          />
        </label>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={busy || !name}
          className="rounded bg-primary-600 px-3 py-1.5 text-sm font-bold text-white disabled:bg-gray-300"
        >
          追加する
        </button>
        {msg && <span className="text-sm text-gray-700">{msg}</span>}
      </div>
      <p className="mt-2 text-xs text-gray-400">
        ※「ハズレ」も 1 件作成し重みを設定すると当選確率を調整できます。当選確率 = 各重み ÷ 全 active 重み合計。
      </p>
    </div>
  )
}

/** Amazon ギフトのコードを在庫プールに一括登録するフォーム */
export function GiftCodeUpload({
  prizes,
}: {
  prizes: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [prizeId, setPrizeId] = useState(prizes[0]?.id ?? "")
  const [codes, setCodes] = useState("")
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (prizes.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-4">
        <h3 className="font-bold text-gray-900">ギフトコードの登録</h3>
        <p className="mt-1 text-xs text-gray-500">
          先に「種別＝金券（Amazonギフト等）」の景品を追加してください。
        </p>
      </div>
    )
  }

  async function submit() {
    setBusy(true)
    setMsg(null)
    const { ok, data } = await postJson(`/api/admin/lottery-prizes/${prizeId}/codes`, {
      codes,
    })
    setBusy(false)
    if (ok) {
      setMsg(`登録 ${data.added} 件（重複スキップ ${data.skipped} 件）／現在の在庫 ${data.available} 件`)
      setCodes("")
      router.refresh()
    } else {
      setMsg(data.error ?? "エラーが発生しました")
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4">
      <h3 className="font-bold text-gray-900">ギフトコードの登録（在庫プール）</h3>
      <p className="mt-1 text-xs text-gray-500">
        Amazonギフトのコードを改行・カンマ区切りで貼り付け。登録した枚数がそのまま当選数の上限になり、
        当選時に1枚ずつ自動で割り当て・LINE自動送付されます。
      </p>
      <div className="mt-3 space-y-2">
        <label className="block text-sm">
          <span className="text-xs text-gray-500">対象景品（金券）</span>
          <select
            value={prizeId}
            onChange={(e) => setPrizeId(e.target.value)}
            className="mt-0.5 block w-full max-w-sm rounded border px-2 py-1.5 text-sm"
          >
            {prizes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <textarea
          value={codes}
          onChange={(e) => setCodes(e.target.value)}
          rows={5}
          placeholder={"XXXX-XXXXXX-XXXX\nYYYY-YYYYYY-YYYY"}
          className="block w-full rounded border px-2 py-1.5 font-mono text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !prizeId || !codes.trim()}
            className="rounded bg-primary-600 px-3 py-1.5 text-sm font-bold text-white disabled:bg-gray-300"
          >
            コードを登録
          </button>
          {msg && <span className="text-sm text-gray-700">{msg}</span>}
        </div>
      </div>
    </div>
  )
}

/** 景品の有効/無効トグル */
export function PrizeToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function toggle() {
    setBusy(true)
    await postJson(`/api/admin/lottery-prizes/${id}`, { active: !active }, "PATCH")
    setBusy(false)
    router.refresh()
  }
  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`rounded px-2 py-1 text-xs font-bold ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-gray-200 text-gray-500"
      }`}
    >
      {active ? "有効" : "無効"}
    </button>
  )
}

/** 当選景品の引き渡し完了ボタン */
export function FulfillButton({ id }: { id: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function fulfill() {
    setBusy(true)
    await postJson(`/api/admin/lottery-draws/${id}`, { fulfillment: "fulfilled" }, "PATCH")
    setBusy(false)
    router.refresh()
  }
  return (
    <button
      type="button"
      onClick={fulfill}
      disabled={busy}
      className="rounded bg-primary-600 px-2 py-1 text-xs font-bold text-white disabled:bg-gray-300"
    >
      発行済にする
    </button>
  )
}
