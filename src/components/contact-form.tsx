"use client"

import { useState } from "react"

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    /** Honeypot field — 通常ユーザは触らない。bot だけが埋める。 */
    website: "",
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  function update<K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSubmitting(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "送信に失敗しました")
        return
      }
      setSubmitted(true)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="border bg-white p-8 shadow-sm text-center">
        <h3 className="text-lg font-bold text-gray-900">
          お問い合わせを受け付けました
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          担当者よりご連絡いたします。通常 1〜2 営業日以内にご返信いたします。
        </p>
      </div>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border bg-white p-6 shadow-sm space-y-4"
    >
      {error && (
        <div className="bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="block text-sm font-medium text-gray-700">
            お名前 <span className="text-red-500">*</span>
          </span>
          <input
            type="text"
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
          />
        </label>

        <label className="block">
          <span className="block text-sm font-medium text-gray-700">
            メールアドレス <span className="text-red-500">*</span>
          </span>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700">
          件名 <span className="text-red-500">*</span>
        </span>
        <input
          type="text"
          required
          maxLength={200}
          value={form.subject}
          onChange={(e) => update("subject", e.target.value)}
          className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium text-gray-700">
          お問い合わせ内容 <span className="text-red-500">*</span>
        </span>
        <textarea
          required
          rows={6}
          maxLength={5000}
          value={form.message}
          onChange={(e) => update("message", e.target.value)}
          className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
        />
        <span className="mt-1 block text-xs text-gray-600">
          {form.message.length} / 5000 文字
        </span>
      </label>

      {/*
        Honeypot — 画面外に配置し、bot のみが埋める想定。
        通常ユーザは無視できるが、aria-hidden + tabIndex=-1 で
        スクリーンリーダ / キーボードも無視する。
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: "-9999px",
          width: "1px",
          height: "1px",
          overflow: "hidden",
        }}
      >
        <label>
          Website (この欄は触らないでください)
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-primary-600 px-4 py-3 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {submitting ? "送信中..." : "送信する"}
      </button>

      <p className="text-xs text-gray-500">
        送信いただいた内容は <strong>info@let-inc.net</strong> 宛に転送されます。
      </p>
    </form>
  )
}
