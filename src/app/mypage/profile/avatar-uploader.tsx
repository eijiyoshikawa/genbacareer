"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, Loader2, Trash2 } from "lucide-react"

/**
 * 求職者の顔写真アップローダー（プロフィール編集ページ上部）。
 * ファイル選択と同時にアップロードし、成功したら router.refresh() で反映。
 */
export function AvatarUploader({
  avatarUrl,
  name,
}: {
  avatarUrl: string | null
  name: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // 同じファイルを選び直せるよう毎回リセット
    e.target.value = ""
    if (!file) return

    setError("")
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/users/me/avatar", {
        method: "POST",
        body: fd,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error ?? "アップロードに失敗しました")
        return
      }
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    if (!confirm("顔写真を削除しますか？")) return
    setError("")
    setBusy(true)
    try {
      const res = await fetch("/api/users/me/avatar", { method: "DELETE" })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "削除に失敗しました")
        return
      }
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">顔写真</h2>
      <div className="mt-4 flex items-center gap-5">
        {/* プレビュー（未設定時は頭文字） */}
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="顔写真"
            className="h-20 w-20 rounded-full border border-gray-200 object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700">
            {name ? name.charAt(0) : "？"}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-primary-400 hover:text-primary-700 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Camera className="h-4 w-4" />
              )}
              {avatarUrl ? "写真を変更" : "写真をアップロード"}
            </button>
            {avatarUrl && (
              <button
                type="button"
                disabled={busy}
                onClick={handleDelete}
                className="inline-flex items-center gap-1 px-2 py-2 text-xs text-gray-500 hover:text-rose-600 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                削除
              </button>
            )}
          </div>
          <p className="text-xs text-gray-500">
            JPEG / PNG / WebP・5MB まで。顔写真があると企業からのスカウトが届きやすくなります。
          </p>
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleSelect}
        />
      </div>
    </div>
  )
}
