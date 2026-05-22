"use client"

import { useSyncExternalStore } from "react"
import { ArrowLeftRight, Check } from "lucide-react"
import {
  addToCompareCart,
  removeFromCompareCart,
  subscribeCompareCart,
  getSnapshotIds,
} from "./compare-cart"

export function CompareAddButton({ jobId }: { jobId: string }) {
  const ids = useSyncExternalStore(
    subscribeCompareCart,
    getSnapshotIds,
    () => [] // SSR
  )
  const inCart = ids.includes(jobId)

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (inCart) {
      removeFromCompareCart(jobId)
    } else {
      const ok = addToCompareCart(jobId)
      if (!ok) {
        alert("比較は 4 件までです。既存のものを外してから追加してください。")
      }
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-1 transition text-xs ${
        inCart
          ? "text-amber-700 hover:text-amber-800"
          : "text-gray-400 hover:text-amber-700"
      }`}
      aria-pressed={inCart}
      title={inCart ? "比較から外す" : "比較に追加"}
    >
      {inCart ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <ArrowLeftRight className="h-3.5 w-3.5" />
      )}
    </button>
  )
}
