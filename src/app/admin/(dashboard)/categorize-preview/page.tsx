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
import { CategorizeBatchRunner } from "./batch-runner"
import { prisma } from "@/lib/db"

export const metadata: Metadata = {
  title: "カテゴリ判定テスト",
}

export const dynamic = "force-dynamic"

export default async function CategorizePreviewPage() {
  // 分類済み / 未分類カウント
  const [classifiedCount, totalActive] = await Promise.all([
    prisma.jobCategoryClassification.count().catch(() => 0),
    prisma.job.count({ where: { status: "active" } }).catch(() => 0),
  ])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Sparkles className="h-6 w-6 text-primary-500" />
          カテゴリ判定テスト / 一括分類
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          タイトル + 説明文を入力すると、ルールベースで建設業 9 カテゴリへの
          分類結果をプレビューします。下のボタンで未分類求人を一括処理できます。
        </p>
        <p className="mt-2 text-xs text-gray-600">
          分類済み: <strong>{classifiedCount.toLocaleString()}</strong> 件 /
          公開中 active 求人: <strong>{totalActive.toLocaleString()}</strong> 件
        </p>
      </header>

      {/* 一括分類 (7.1) */}
      <CategorizeBatchRunner />

      {/* テストプレビュー (8.2) */}
      <CategorizePreviewForm />
    </div>
  )
}
