import type { ReactNode } from "react"

type Sns = {
  instagramUrl: string | null
  tiktokUrl: string | null
  facebookUrl: string | null
  xUrl: string | null
  youtubeUrl: string | null
}

const ICONS: Record<
  keyof Sns,
  { label: string; icon: ReactNode; bg: string }
> = {
  instagramUrl: {
    label: "Instagram",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden
      >
        <rect x="2" y="2" width="20" height="20" rx="5" />
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
      </svg>
    ),
    bg: "bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600",
  },
  tiktokUrl: {
    label: "TikTok",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-4 w-4"
        aria-hidden
      >
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V7.51a8.16 8.16 0 0 0 4.78 1.55v-3.44a4.85 4.85 0 0 1-1-.93z" />
      </svg>
    ),
    bg: "bg-black",
  },
  facebookUrl: {
    label: "Facebook",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z" />
      </svg>
    ),
    bg: "bg-[#1877F2]",
  },
  xUrl: {
    label: "X (Twitter)",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    bg: "bg-black",
  },
  youtubeUrl: {
    label: "YouTube",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden>
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6z" />
      </svg>
    ),
    bg: "bg-[#FF0000]",
  },
}

const ORDER: (keyof Sns)[] = [
  "instagramUrl",
  "tiktokUrl",
  "facebookUrl",
  "xUrl",
  "youtubeUrl",
]

/**
 * 企業 SNS リンクのアイコン群。
 * 5 種すべてが空なら null（セクション自体非表示）。
 */
export function SnsLinks({ sns }: { sns: Sns }) {
  const visible = ORDER.filter((k) => !!sns[k])
  if (visible.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((k) => {
        const url = sns[k]!
        const { label, icon, bg } = ICONS[k]
        return (
          <a
            key={k}
            href={url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            aria-label={`${label} を開く`}
            title={label}
            className={`inline-flex items-center justify-center h-9 w-9 text-white shadow-sm transition hover:opacity-85 ${bg}`}
          >
            {icon}
          </a>
        )
      })}
    </div>
  )
}
