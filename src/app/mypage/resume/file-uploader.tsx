"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"

export function FileUploader() {
  const router = useRouter()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // サーバーに送る前に大きさを確かめる (上限を超えると基盤側で拒否され、理由が伝わらない)
    if (file.size > 4 * 1024 * 1024) {
      setError("ファイルサイズは4MB以下にしてください")
      e.target.value = ""
      return
    }

    setUploading(true)
    setError("")

    const formData = new FormData()
    formData.append("file", file)
    formData.append("fileType", file.name.includes("職務") ? "cv" : "resume")

    try {
      const res = await fetch("/api/users/me/files", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => null)
        setError(
          data?.error ||
            (res.status === 413
              ? "ファイルサイズは4MB以下にしてください"
              : "アップロードに失敗しました")
        )
        return
      }

      router.refresh()
    } catch {
      setError("アップロード中にエラーが発生しました")
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  return (
    <div className="mt-3">
      <label className="flex cursor-pointer items-center justify-center gap-2 border-2 border-dashed border-gray-300 bg-gray-50 p-6 text-sm text-gray-500 hover:border-primary-400 hover:bg-primary-50 transition">
        <Upload className="h-5 w-5" />
        {uploading ? "アップロード中..." : "ファイルを選択してアップロード"}
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={handleUpload}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  )
}
