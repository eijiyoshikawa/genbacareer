"use client"

import { useRef, useState } from "react"
import { Loader2, MapPin } from "lucide-react"
import type { PostalAddress } from "@/lib/postal-lookup"

type Props = {
  id?: string
  /** 入力中の郵便番号文字列（ハイフン有無問わず） */
  value: string
  onValueChange: (value: string) => void
  /** 7 桁入力時に住所が引けたら呼ばれる。フォーム側で各フィールドへ反映する */
  onResolved: (address: PostalAddress) => void
  className?: string
  required?: boolean
  /** ラベルを表示するか（false なら入力欄のみ） */
  label?: string
}

/**
 * 郵便番号入力欄。7 桁そろった時点で /api/postal を叩いて住所を取得し、
 * onResolved で親フォームに渡す（都道府県/市区町村などの自動補完用）。
 *
 * - 7 桁入力で自動検索。手動の「住所を反映」ボタンでも再検索できる。
 * - 失敗しても手入力にフォールバックできるよう、エラーは控えめに表示。
 */
export function PostalCodeInput({
  id = "postalCode",
  value,
  onValueChange,
  onResolved,
  className,
  required,
  label = "郵便番号",
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [done, setDone] = useState(false)
  // 同じ郵便番号で二重に検索しないための直近検索値
  const lastLookedUp = useRef<string>("")

  const baseClass =
    "mt-1 block w-full border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"

  async function lookup(rawZip: string) {
    const digits = rawZip.replace(/[０-９]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xfee0)
    ).replace(/[^0-9]/g, "")
    if (digits.length !== 7) {
      setError("郵便番号は 7 桁で入力してください")
      return
    }
    if (digits === lastLookedUp.current) return
    lastLookedUp.current = digits

    setLoading(true)
    setError("")
    setDone(false)
    try {
      const res = await fetch(`/api/postal?zip=${digits}`)
      const data = (await res.json().catch(() => null)) as
        | { address?: PostalAddress; error?: string }
        | null
      if (!res.ok || !data?.address) {
        setError(data?.error ?? "住所の取得に失敗しました")
        return
      }
      onResolved(data.address)
      setDone(true)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  function handleChange(next: string) {
    onValueChange(next)
    setDone(false)
    setError("")
    // 7 桁そろったら自動検索
    const digits = next.replace(/[０-９]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xfee0)
    ).replace(/[^0-9]/g, "")
    if (digits.length === 7) {
      void lookup(next)
    } else {
      lastLookedUp.current = ""
    }
  }

  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      <div className="mt-1 flex items-stretch gap-2">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          required={required}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onBlur={() => value && lookup(value)}
          placeholder="1000001"
          className={`${baseClass} ${label ? "!mt-0" : ""} flex-1`}
        />
        <button
          type="button"
          onClick={() => lookup(value)}
          disabled={loading}
          className="press inline-flex shrink-0 items-center gap-1 border border-gray-300 bg-white px-3 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <MapPin className="h-3.5 w-3.5" />
          )}
          住所反映
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {done && !error && (
        <p className="mt-1 text-xs text-emerald-600">住所を自動入力しました</p>
      )}
    </div>
  )
}
