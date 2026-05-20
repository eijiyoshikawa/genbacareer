/**
 * 8.2 カテゴリ判定テスト・プレビュー。
 *
 * admin が任意の求人タイトル + 説明文を入力すると、
 * src/lib/category-guess.ts のルールベース判定結果と信頼度・マッチ
 * キーワードを表示する。7.1 タグ付け運用前の精度確認用。
 */

import type { Metadata } from "next"
import { Sparkles } from "lucide-react"
import { CategorizePreviewForm } from "./categorize-preview-form"

export const metadata: Metadata = {
  title: "カテゴリ判定テスト",
}

export const dynamic = "force-dynamic"

export default function CategorizePreviewPage() {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Sparkles className="h-6 w-6 text-primary-500" />
        カテゴリ判定テスト
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        タイトル + 説明文を入力すると、ルールベースで建設業 9 カテゴリへの分類結果を
        プレビューします。実際の取り込み (7.1) でも同じ判定が使われます。
      </p>

      <div className="mt-6">
        <CategorizePreviewForm />
      </div>
    </div>
  )
}
