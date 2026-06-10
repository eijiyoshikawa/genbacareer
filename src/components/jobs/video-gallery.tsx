import { parseVideoUrls } from "@/lib/video-embed"
import { VideoCamera } from "@phosphor-icons/react/dist/ssr"

const PROVIDER_LABEL: Record<string, string> = {
  youtube: "YouTube",
  tiktok: "TikTok",
  vimeo: "Vimeo",
  instagram: "Instagram",
}

export function VideoGallery({ urls }: { urls: string[] }) {
  const videos = parseVideoUrls(urls)
  if (videos.length === 0) return null

  return (
    <section>
      <h2 className="flex items-center gap-1.5 text-lg font-semibold text-gray-900">
        <VideoCamera weight="duotone" className="h-5 w-5 text-primary-600" />
        現場の動画・SNS
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        実際の職場・現場の様子を動画や SNS 投稿でご覧いただけます。
      </p>
      <div className="mt-3 grid items-start gap-4 sm:grid-cols-2">
        {videos.map((v, i) => {
          // TikTok / Instagram は縦型。投稿全体が切れないよう 9:16 の縦コンテナにし、
          // PC では幅を絞って中央寄せ、SP では横幅いっぱいに表示する。
          // YouTube / Vimeo は従来どおり 16:9 の横長。
          const label = PROVIDER_LABEL[v.provider] ?? v.provider
          return (
            <figure
              key={v.embedUrl + i}
              className={
                v.portrait
                  ? "mx-auto w-full max-w-[340px] border bg-black"
                  : "border bg-black"
              }
            >
              <div
                className="relative w-full"
                style={{ aspectRatio: v.portrait ? "9 / 16" : "16 / 9" }}
              >
                <iframe
                  src={v.embedUrl}
                  title={`${label} ${i + 1}`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                  scrolling="no"
                  className="absolute inset-0 h-full w-full"
                />
              </div>
              <figcaption className="bg-white px-2 py-1 text-xs text-gray-500 flex items-center justify-between">
                <span>{label}</span>
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
          )
        })}
      </div>
    </section>
  )
}
