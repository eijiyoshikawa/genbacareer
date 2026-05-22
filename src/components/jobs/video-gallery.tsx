import { parseVideoUrls } from "@/lib/video-embed"
import { VideoCamera } from "@phosphor-icons/react/dist/ssr"

const PROVIDER_LABEL: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  vimeo: "Vimeo",
}

export function VideoGallery({ urls }: { urls: string[] }) {
  const videos = parseVideoUrls(urls)
  if (videos.length === 0) return null

  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
        <VideoCamera weight="duotone" className="h-5 w-5 text-primary-600" />
        現場の動画
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        実際の職場・現場の様子を動画でご覧いただけます。
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {videos.map((v, i) => (
          <figure key={v.embedUrl + i} className="border bg-black">
            <div className="relative w-full" style={{ aspectRatio: "16 / 9" }}>
              <iframe
                src={v.embedUrl}
                title={`${PROVIDER_LABEL[v.provider] ?? v.provider} 動画 ${i + 1}`}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                referrerPolicy="strict-origin-when-cross-origin"
                className="absolute inset-0 h-full w-full"
              />
            </div>
            <figcaption className="bg-white px-2 py-1 text-xs text-gray-500 flex items-center justify-between">
              <span>{PROVIDER_LABEL[v.provider] ?? v.provider}</span>
              <a
                href={v.originalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-700 hover:underline"
              >
                元のページで開く →
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  )
}
