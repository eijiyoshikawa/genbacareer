"use client"

/**
 * 記事共有ボタン (X / LINE / Facebook)。
 * 13.1 ブログ強化の一部。
 *
 * Native Web Share API があれば優先 (モバイル)、無ければ各 SNS URL を新窓で開く。
 */

import { useState } from "react"
import { Share2, X } from "lucide-react"
import { FacebookLogo } from "@phosphor-icons/react"

interface Props {
  url: string
  title: string
  /** trackEvent と連携するための article id */
  articleId?: string
}

export function ShareButtons({ url, title, articleId }: Props) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  function logShare(channel: string) {
    fetch("/api/track/share-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ articleId, channel }),
      keepalive: true,
    }).catch(() => {})
  }

  async function handleNativeShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url })
        logShare("native")
      } catch {
        // user cancelled
      }
    } else {
      // fallback: copy URL
      try {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 1500)
        logShare("copy")
      } catch {
        // ignore
      }
    }
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">シェア:</span>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="X (Twitter) でシェア"
        onClick={() => logShare("x")}
        className="flex h-8 w-8 items-center justify-center border border-gray-300 hover:bg-gray-50"
      >
        <X className="h-4 w-4" />
      </a>
      <a
        href={`https://social-plugins.line.me/lineit/share?url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="LINE でシェア"
        onClick={() => logShare("line")}
        className="flex h-8 px-3 items-center justify-center border border-[#06C755] bg-[#06C755] text-white text-xs font-bold hover:opacity-90"
      >
        LINE
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Facebook でシェア"
        onClick={() => logShare("facebook")}
        className="flex h-8 w-8 items-center justify-center border border-gray-300 hover:bg-gray-50"
      >
        <FacebookLogo className="h-4 w-4" weight="fill" />
      </a>
      <button
        type="button"
        onClick={handleNativeShare}
        aria-label={copied ? "URL をコピーしました" : "その他の方法でシェア"}
        className="flex h-8 px-3 items-center gap-1 border border-gray-300 text-xs hover:bg-gray-50"
      >
        <Share2 className="h-3.5 w-3.5" />
        {copied ? "コピー済み" : "その他"}
      </button>
    </div>
  )
}
