"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  type NotificationPrefs,
  type NotificationFrequency,
  FREQUENCY_LABELS,
} from "@/lib/notification-prefs"

export function NotificationPrefsForm({ initial }: { initial: NotificationPrefs }) {
  const router = useRouter()
  const [prefs, setPrefs] = useState<NotificationPrefs>(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState("")

  function update<K extends keyof NotificationPrefs>(
    key: K,
    value: NotificationPrefs[K]
  ) {
    setPrefs((p) => ({ ...p, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError("")
    setSaved(false)
    try {
      const res = await fetch("/api/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationPrefs: prefs }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "保存に失敗しました")
        return
      }
      setSaved(true)
      router.refresh()
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSaving(false)
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i)

  return (
    <div className="space-y-6">
      {/* チャネル */}
      <section className="border bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          受け取るチャネル
        </h2>
        <Toggle
          label="メール"
          desc="応募ステータス変更や新着求人をメールで受け取る"
          checked={prefs.emailEnabled}
          onChange={(v) => update("emailEnabled", v)}
        />
        <Toggle
          label="LINE"
          desc="LINE 公式アカウント経由で Flex メッセージ配信"
          checked={prefs.lineEnabled}
          onChange={(v) => update("lineEnabled", v)}
        />
        <Toggle
          label="プッシュ通知"
          desc="ブラウザ Push (将来対応予定、現在は LINE/メールのみ動作)"
          checked={prefs.pushEnabled}
          onChange={(v) => update("pushEnabled", v)}
        />
      </section>

      {/* 配信頻度 */}
      <section className="border bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          配信頻度
        </h2>
        <div className="space-y-2">
          {(Object.keys(FREQUENCY_LABELS) as NotificationFrequency[]).map((f) => (
            <label key={f} className="flex items-start gap-3 cursor-pointer">
              <input
                type="radio"
                name="frequency"
                value={f}
                checked={prefs.frequency === f}
                onChange={() => update("frequency", f)}
                className="mt-1 h-4 w-4 border-gray-300 text-primary-600"
              />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {FREQUENCY_LABELS[f]}
                </p>
                <p className="text-xs text-gray-500">
                  {f === "immediate" && "新着があり次第すぐに配信"}
                  {f === "daily" && "1 日 1 回まとめて配信 (朝 9 時頃)"}
                  {f === "weekly" && "週 1 回まとめて配信 (月曜朝)"}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* 静音時間帯 */}
      <section className="border bg-white dark:bg-gray-900 p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-900 dark:text-gray-100">
          静音時間帯 (任意)
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          設定した時間帯は通知を送らず、終了時刻以降にまとめて配信されます。
          深夜や勤務時間に届かないようにしたい場合に。
        </p>
        <div className="flex items-center gap-3">
          <select
            value={prefs.quietHoursStart ?? ""}
            onChange={(e) =>
              update(
                "quietHoursStart",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
          >
            <option value="">設定しない</option>
            {hours.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500">〜</span>
          <select
            value={prefs.quietHoursEnd ?? ""}
            onChange={(e) =>
              update(
                "quietHoursEnd",
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-3 py-2 text-sm"
          >
            <option value="">設定しない</option>
            {hours.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00
              </option>
            ))}
          </select>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/30 p-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {saved && (
        <div className="bg-green-50 dark:bg-green-900/30 p-3 text-sm text-green-700 dark:text-green-300">
          通知設定を保存しました
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="bg-primary-500 px-6 py-2 text-sm font-bold text-white hover:bg-primary-600 disabled:opacity-50"
        >
          {saving ? "保存中..." : "保存する"}
        </button>
      </div>
    </div>
  )
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string
  desc: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 border-gray-300 text-primary-600"
      />
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
      </div>
    </label>
  )
}
