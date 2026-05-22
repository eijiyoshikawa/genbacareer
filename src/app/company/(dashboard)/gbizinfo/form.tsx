"use client"

import { useState, useTransition } from "react"
import { Save, RefreshCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  saveCorporateNumber,
  refreshGbizData,
  clearCorporateNumber,
  type GbizActionResult,
} from "./actions"

export function GbizInfoForm({
  companyName,
  corporateNumber,
  syncedAt,
  canEdit,
}: {
  companyName: string
  corporateNumber: string | null
  syncedAt: Date | null
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<GbizActionResult | null>(null)

  function submit(formData: FormData) {
    setResult(null)
    startTransition(async () => {
      const res = await saveCorporateNumber(formData)
      setResult(res)
    })
  }

  function refresh() {
    setResult(null)
    startTransition(async () => {
      const res = await refreshGbizData()
      setResult(res)
    })
  }

  function clear() {
    if (
      !confirm(
        "法人番号と取得済みの GbizINFO データを削除します。よろしいですか？"
      )
    ) {
      return
    }
    setResult(null)
    startTransition(async () => {
      const res = await clearCorporateNumber()
      setResult(res)
    })
  }

  return (
    <section className="border bg-white p-6">
      <h2 className="text-lg font-bold text-gray-900">法人番号の登録</h2>
      <p className="mt-1 text-xs text-gray-500">
        国税庁の法人番号（13 桁の数字）を入力してください。
        登録すると GbizINFO から「<strong>{companyName}</strong>」の企業情報を取り込みます。
      </p>
      <p className="mt-1 text-xs text-gray-500">
        法人番号がわからない場合は{" "}
        <a
          href="https://www.houjin-bangou.nta.go.jp/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary-600 hover:underline"
        >
          国税庁 法人番号公表サイト
        </a>{" "}
        から検索できます。
      </p>

      <form action={submit} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor="corporateNumber"
            className="block text-xs font-bold text-gray-700"
          >
            法人番号（13 桁）
          </label>
          <input
            id="corporateNumber"
            name="corporateNumber"
            type="text"
            inputMode="numeric"
            pattern="\d{13}"
            maxLength={13}
            defaultValue={corporateNumber ?? ""}
            placeholder="1234567890123"
            disabled={!canEdit || pending}
            required
            className="mt-1 h-11 w-full max-w-xs border border-gray-300 bg-white px-3 font-mono text-base text-gray-900 focus:border-primary-500 focus:outline-none disabled:bg-gray-100"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!canEdit || pending}
          >
            <Save className="h-4 w-4" />
            保存して取り込む
          </Button>
          {corporateNumber && (
            <>
              <Button
                type="button"
                onClick={refresh}
                variant="secondary"
                size="md"
                disabled={!canEdit || pending}
              >
                <RefreshCcw className="h-4 w-4" />
                再取得
              </Button>
              <Button
                type="button"
                onClick={clear}
                variant="ghost"
                size="md"
                disabled={!canEdit || pending}
                className="text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                削除
              </Button>
            </>
          )}
        </div>
      </form>

      {result && (
        <p
          className={`mt-3 text-sm ${
            result.ok ? "text-emerald-700" : "text-red-700"
          }`}
        >
          {result.ok ? result.message : `❌ ${result.error}`}
        </p>
      )}

      {syncedAt && (
        <p className="mt-3 text-xs text-gray-400">
          最終取得: {syncedAt.toLocaleString("ja-JP")}
        </p>
      )}
    </section>
  )
}
