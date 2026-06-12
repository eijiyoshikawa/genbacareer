import Link from "next/link"
import { prisma } from "@/lib/db"

type Voice = { quote: string; who: string }

// DB(testimonials)が空のときに使うフォールバック（サンプル）
const FALLBACK_VOICES: Voice[] = [
  {
    quote:
      "未経験で入って1年。玉掛けと足場の資格を会社負担で取らせてもらい、給料も入社時より4万円上がりました。",
    who: "20代・鳶工",
  },
  {
    quote:
      "人間関係が良くて毎日が楽しい。職人として一生やっていける自信がつきました。",
    who: "30代・型枠大工",
  },
  {
    quote:
      "LINEで気軽に応募できたのが決め手。今は施工管理を目指して勉強中です。",
    who: "20代・施工管理",
  },
]

/**
 * ブランドコピー + 利用者の声（体験談の前面化）。
 * 「この現場に来てよかった」を、一人ひとりに——という想いを伝えるセクション。
 */
export async function VoiceSection() {
  // DB の testimonials を優先。空 or エラー時はサンプルにフォールバック。
  const rows = await prisma.testimonial
    .findMany({
      where: { published: true },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 3,
      select: { quote: true, who: true },
    })
    .catch(() => [] as Voice[])
  const VOICES: Voice[] = rows.length > 0 ? rows : FALLBACK_VOICES

  return (
    <section className="bg-ink-900 text-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="text-center">
          <p className="text-xs font-bold tracking-[0.25em] text-brand-yellow-500">
            VOICE
          </p>
          <h2 className="mt-2 text-2xl font-black leading-tight tracking-tight sm:text-3xl">
            「この現場に、来てよかった。」
            <br className="hidden sm:block" />
            を、一人ひとりに。
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-white/80">
            ゲンバキャリアは、未経験から手に職をつけ、
            <wbr />
            「稼げる自分」に出会う人を応援します。
          </p>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {VOICES.map((v, i) => (
            <figure
              key={i}
              className="relative border-l-4 border-brand-yellow-500 bg-white/5 p-5"
            >
              <span
                aria-hidden
                className="absolute right-3 top-1 text-4xl font-black text-white/10"
              >
                ”
              </span>
              <blockquote className="text-sm leading-relaxed text-white/90">
                {v.quote}
              </blockquote>
              <figcaption className="mt-3 text-xs font-bold text-brand-yellow-500">
                {v.who}
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="mt-8 flex flex-col justify-center gap-2.5 sm:flex-row">
          <Link
            href="/jobs"
            className="press btn-brand-gradient inline-flex items-center justify-center px-6 py-3 text-sm font-extrabold"
          >
            求人を探す
          </Link>
          <Link
            href="/journal?category=interview"
            className="press inline-flex items-center justify-center border border-white/30 px-6 py-3 text-sm font-bold text-white hover:bg-white/10"
          >
            体験談をもっと読む
          </Link>
        </div>
      </div>
    </section>
  )
}
