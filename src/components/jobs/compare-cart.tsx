"use client"

import { useSyncExternalStore } from "react"
import Link from "next/link"
import { ArrowLeftRight, X } from "lucide-react"

const STORAGE_KEY = "genbacareer.compare-cart"
const MAX = 4

// ---------------- external store ----------------
// useSyncExternalStore で stale-free に購読できる、シンプルな module-level store。

let cachedIds: string[] = []
let cacheValid = false
const listeners = new Set<() => void>()

function readFromStorage(): string[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw) as unknown
    if (!Array.isArray(arr)) return []
    return arr
      .filter((x): x is string => typeof x === "string")
      .slice(0, MAX)
  } catch {
    return []
  }
}

function ensureCache(): string[] {
  if (!cacheValid) {
    cachedIds = readFromStorage()
    cacheValid = true
  }
  return cachedIds
}

function emit() {
  for (const l of listeners) l()
}

function writeStorage(ids: string[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids.slice(0, MAX)))
    cachedIds = ids.slice(0, MAX)
    cacheValid = true
    emit()
  } catch {
    // quota / disabled — ignore
  }
}

export function getSnapshotIds(): string[] {
  return ensureCache()
}

export function subscribeCompareCart(callback: () => void): () => void {
  listeners.add(callback)
  // 他タブからの storage event にも追従
  const storageHandler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cacheValid = false
      callback()
    }
  }
  if (typeof window !== "undefined") {
    window.addEventListener("storage", storageHandler)
  }
  return () => {
    listeners.delete(callback)
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", storageHandler)
    }
  }
}

// ---------------- mutators ----------------

export function addToCompareCart(jobId: string): boolean {
  const cur = ensureCache()
  if (cur.includes(jobId)) return false
  if (cur.length >= MAX) return false
  writeStorage([...cur, jobId])
  return true
}

export function removeFromCompareCart(jobId: string): void {
  writeStorage(ensureCache().filter((id) => id !== jobId))
}

export function clearCompareCart(): void {
  writeStorage([])
}

// ---------------- UI ----------------

export function CompareCart() {
  const ids = useSyncExternalStore(subscribeCompareCart, getSnapshotIds, () => [])
  if (ids.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm border bg-white shadow-lg">
      <div className="flex items-center justify-between gap-3 border-b bg-amber-50 px-3 py-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-amber-900">
          <ArrowLeftRight className="h-4 w-4" />
          求人比較カート（{ids.length}/{MAX}）
        </p>
        <button
          type="button"
          onClick={clearCompareCart}
          className="text-xs text-gray-500 hover:text-red-600"
        >
          クリア
        </button>
      </div>
      <ul className="divide-y px-3 py-2 text-xs">
        {ids.map((id) => (
          <li key={id} className="flex items-center justify-between gap-2 py-1.5">
            <span className="font-mono text-xs text-gray-500 truncate">
              {id.slice(0, 8)}...
            </span>
            <button
              type="button"
              onClick={() => removeFromCompareCart(id)}
              className="text-gray-400 hover:text-red-600"
              aria-label="除外"
            >
              <X className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ul>
      <div className="border-t p-2">
        <Link
          href={`/jobs/compare?ids=${ids.join(",")}`}
          className="press flex items-center justify-center gap-1 bg-primary-600 hover:bg-primary-700 px-3 py-2 text-xs font-bold text-white"
        >
          {ids.length} 件を比較する →
        </Link>
      </div>
    </div>
  )
}
