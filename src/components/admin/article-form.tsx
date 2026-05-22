"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ARTICLE_CATEGORIES } from "@/lib/article-categories"

export type ArticleFormValues = {
  slug: string
  title: string
  excerpt: string
  body: string
  category: string
  tags: string // カンマ区切りで保持
  imageUrl: string
  metaDescription: string
  authorName: string
  status: "draft" | "published"
  featured: boolean
  publishedAt: string // YYYY-MM-DDTHH:mm（datetime-local）
}

export const emptyArticleForm: ArticleFormValues = {
  slug: "",
  title: "",
  excerpt: "",
  body: "",
  category: "career",
  tags: "",
  imageUrl: "",
  metaDescription: "",
  authorName: "ゲンバキャリア編集部",
  status: "draft",
  featured: false,
  publishedAt: "",
}

type Props = {
  mode: "create" | "edit"
  articleId?: string
  initialValues: ArticleFormValues
}

export function ArticleForm({ mode, articleId, initialValues }: Props) {
  const router = useRouter()
  const [form, setForm] = useState<ArticleFormValues>(initialValues)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const update = <K extends keyof ArticleFormValues>(
    field: K,
    value: ArticleFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const buildPayload = () => {
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    return {
      slug: form.slug.trim(),
      title: form.title.trim(),
      excerpt: form.excerpt || null,
      body: form.body,
      category: form.category,
      tags,
      imageUrl: form.imageUrl || null,
      metaDescription: form.metaDescription || null,
      authorName: form.authorName || "ゲンバキャリア編集部",
      status: form.status,
      featured: form.featured,
      publishedAt: form.publishedAt
        ? new Date(form.publishedAt).toISOString()
        : null,
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!form.slug.trim()) {
      setError("slug は必須です")
      return
    }
    if (!form.title.trim()) {
      setError("タイトルは必須です")
      return
    }
    if (!form.body.trim()) {
      setError("本文は必須です")
      return
    }

    setLoading(true)
    try {
      const url =
        mode === "create"
          ? "/api/admin/articles"
          : `/api/admin/articles/${articleId}`
      const method = mode === "create" ? "POST" : "PUT"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || "保存に失敗しました")
        return
      }
      router.push("/admin/articles")
      router.refresh()
    } catch {
      setError("保存中にエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!articleId) return
    if (!confirm("本当にこの記事を削除しますか？（取り消せません）")) return

    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/articles/${articleId}`, {
        method: "DELETE",
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "削除に失敗しました")
        return
      }
      router.push("/admin/articles")
      router.refresh()
    } catch {
      setError("削除中にエラーが発生しました")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "create" ? "記事を追加" : "記事を編集"}
        </h1>
        <Link
          href="/admin/articles"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          ← 一覧に戻る
        </Link>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-6 space-y-6 border bg-white p-6 shadow-sm"
      >
        <div>
          <label className="block text-sm font-medium text-gray-700">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="建設業界の現状と将来性 — 2026年版"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            slug（URL の一部）<span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={form.slug}
            onChange={(e) => update("slug", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm font-mono focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="construction-industry-overview-2026"
          />
          <p className="mt-1 text-xs text-gray-500">
            小文字英数字とハイフンのみ。URL: /journal/{form.slug || "your-slug"}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ARTICLE_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              著者名
            </label>
            <input
              type="text"
              value={form.authorName}
              onChange={(e) => update("authorName", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              placeholder="ゲンバキャリア編集部"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            タグ（カンマ区切り）
          </label>
          <input
            type="text"
            value={form.tags}
            onChange={(e) => update("tags", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="業界動向, 市場規模, 未経験"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            抜粋（excerpt）
          </label>
          <textarea
            rows={3}
            value={form.excerpt}
            onChange={(e) => update("excerpt", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="一覧ページに表示される1〜2文の紹介文"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            メタディスクリプション（SEO）
          </label>
          <textarea
            rows={2}
            value={form.metaDescription}
            onChange={(e) => update("metaDescription", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="検索結果に表示される説明文（120〜160文字推奨）"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            アイキャッチ画像URL
          </label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => update("imageUrl", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder="https://images.unsplash.com/..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            本文（HTML）<span className="text-red-500">*</span>
          </label>
          <textarea
            required
            rows={20}
            value={form.body}
            onChange={(e) => update("body", e.target.value)}
            className="mt-1 block w-full border border-gray-300 px-3 py-2 font-mono text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            placeholder={"<h2>見出し</h2>\n<p>本文...</p>"}
          />
          <p className="mt-1 text-xs text-gray-500">
            HTML 直接入力。h2 / h3 / p / ul / li / table / img などが使えます。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              状態
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                update("status", e.target.value as "draft" | "published")
              }
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              公開日時（任意）
            </label>
            <input
              type="datetime-local"
              value={form.publishedAt}
              onChange={(e) => update("publishedAt", e.target.value)}
              className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              空欄で公開時 = 現在時刻
            </p>
          </div>

          <div className="flex items-center">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => update("featured", e.target.checked)}
                className="h-4 w-4 border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              注目記事にする
            </label>
          </div>
        </div>

        <div className="flex justify-between border-t pt-6">
          {mode === "edit" ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "削除中..." : "削除"}
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <Link
              href="/admin/articles"
              className="border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              キャンセル
            </Link>
            <button
              type="submit"
              disabled={loading || deleting}
              className="bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "保存中..." : mode === "create" ? "作成する" : "更新する"}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
