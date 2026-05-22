"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { Loader2, Upload, X } from "lucide-react"

type ImageKind = "logo" | "photo"

interface SingleProps {
  kind: ImageKind
  value: string
  onChange: (url: string) => void
  label: string
  hint?: string
  size?: "sm" | "md"
}

/**
 * 単一画像のアップローダ。Supabase Storage に POST → 公開 URL を value に反映。
 * onChange("") で削除（DB 側でも null になる）。
 */
export function ImageUploader({
  kind,
  value,
  onChange,
  label,
  hint,
  size = "md",
}: SingleProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  const previewSize = size === "sm" ? 80 : 120

  async function handlePick(file: File) {
    setUploading(true)
    setError("")
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("kind", kind)
      const res = await fetch("/api/company/media/upload", {
        method: "POST",
        body: form,
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "アップロードに失敗しました")
        return
      }
      const data = (await res.json()) as { url: string }
      onChange(data.url)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <p className="text-sm font-bold text-gray-700">{label}</p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}

      <div className="mt-2 flex items-start gap-3">
        <div
          className="relative shrink-0 border bg-gray-50 overflow-hidden"
          style={{ width: previewSize, height: previewSize }}
        >
          {value ? (
            <Image
              src={value}
              alt={label}
              fill
              sizes={`${previewSize}px`}
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
              未設定
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 text-xs">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handlePick(f)
              e.target.value = ""
            }}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1 border bg-white hover:bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {value ? "差し替え" : "アップロード"}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-1 text-red-600 hover:underline"
            >
              <X className="h-3 w-3" />
              削除
            </button>
          )}
          <p className="text-xs text-gray-500">JPEG / PNG / WebP 5MB まで</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>

      {value && (
        <details className="mt-2 text-xs text-gray-500">
          <summary className="cursor-pointer">直接 URL を入力（高度）</summary>
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 block w-full border px-2 py-1 font-mono text-xs"
          />
        </details>
      )}
    </div>
  )
}

interface MultiProps {
  values: string[]
  onChange: (urls: string[]) => void
  max?: number
  label: string
  hint?: string
}

/**
 * 複数画像（写真ギャラリー）のアップローダ。
 * - 既存 URL 入力欄も併存させて、URL 直貼りもサポート（後方互換）
 */
export function MultiImageUploader({
  values,
  onChange,
  max = 12,
  label,
  hint,
}: MultiProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")

  async function handlePick(files: FileList) {
    setUploading(true)
    setError("")
    const newUrls: string[] = []
    const remaining = max - values.filter(Boolean).length
    const toUpload = Array.from(files).slice(0, remaining)
    for (const file of toUpload) {
      try {
        const form = new FormData()
        form.append("file", file)
        form.append("kind", "photo")
        const res = await fetch("/api/company/media/upload", {
          method: "POST",
          body: form,
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null
          setError(data?.error ?? "1 つ以上のアップロードに失敗しました")
          continue
        }
        const data = (await res.json()) as { url: string }
        newUrls.push(data.url)
      } catch {
        setError("通信エラーが発生しました")
      }
    }
    if (newUrls.length > 0) {
      const merged = [...values.filter(Boolean), ...newUrls].slice(0, max)
      onChange(merged)
    }
    setUploading(false)
  }

  function removeAt(idx: number) {
    onChange(values.filter((_, i) => i !== idx))
  }

  return (
    <div>
      <p className="text-sm font-bold text-gray-700">
        {label} <span className="text-xs font-normal text-gray-400">（最大 {max} 枚）</span>
      </p>
      {hint && <p className="mt-0.5 text-xs text-gray-500">{hint}</p>}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
        {values.map((url, i) => (
          <div key={i} className="relative aspect-square border bg-gray-50 overflow-hidden">
            {url ? (
              <Image
                src={url}
                alt={`写真 ${i + 1}`}
                fill
                sizes="120px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                空
              </div>
            )}
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-0.5 right-0.5 bg-white/90 border text-red-600 hover:bg-red-50 p-0.5"
              aria-label="削除"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {values.filter(Boolean).length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="aspect-square border border-dashed border-primary-300 bg-primary-50/30 hover:bg-primary-50 text-primary-700 flex items-center justify-center text-xs font-bold disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = e.target.files
          if (fs && fs.length > 0) void handlePick(fs)
          e.target.value = ""
        }}
      />
    </div>
  )
}
