import Link from "next/link"
import Image from "next/image"
import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"
import { publishedArticleFilter } from "@/lib/articles"
import { withTimeout } from "@/lib/with-timeout"
import { diversifyByCompany } from "@/lib/job-diversify"
import {
  Search,
  Building2,
  ArrowRight,
  MapPin,
  Newspaper,
  Sparkles,
  MessageCircle,
  Banknote,
  GraduationCap,
  Home as HomeIcon,
  Award,
  CalendarDays,
  TrendingUp,
  Users,
} from "lucide-react"
import { CATEGORY_LABELS } from "@/lib/article-categories"
import { RecommendedForYou } from "@/components/jobs/recommended-for-you"
import { Section } from "@/components/ui/section"
import { getCategoryCounts } from "@/lib/job-stats"
import type { Metadata } from "next"

// ホームは ISR で 24 時間キャッシュ。/api/cron/warmup が 5 分おきに叩いて
// CDN キャッシュとラムダをウォームに保つため、PageSpeed や初回訪問でも
// コールド lambda の 5 秒待ちが発生しない。
// 新着求人や記事の反映が遅れる場合は、管理画面側で revalidatePath('/') を
// 叩く運用にする（公開直後の即時反映が必要なケース）。
export const revalidate = 86400

export const metadata: Metadata = {
  title: "ゲンバキャリア | 建築・土木・電気・内装の求人サイト",
  description:
    "20〜30 代の若手も活躍中。建築・土木・電気・内装・解体・ドライバー・施工管理・測量の求人を探せる建設業特化型求人サイト。LINE で気軽に応募。",
  alternates: { canonical: "/" },
}

// Hero は opacity:0.55 で重ねるため高解像度は不要。
// w=2000 → 1600, q=80 → 70 で見た目維持・データ削減。
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1600&q=70"

const FEATURE_BANNERS: Array<{
  href: string
  badge: string
  title: string
  desc: string
  image: string
}> = [
  {
    href: "/jobs?q=未経験",
    badge: "未経験 OK",
    title: "未経験から始める建設キャリア",
    desc: "20〜30 代の若手が活躍中。研修・資格支援が充実した会社を厳選。",
    image:
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1000&q=70",
  },
  {
    href: "/jobs?q=資格",
    badge: "資格取得支援",
    title: "国家資格を取りながら働く",
    desc: "施工管理技士・電気工事士・玉掛けなど、会社負担で取れる求人を厳選。",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=70",
  },
  {
    href: "/jobs",
    badge: "全国 47 都道府県",
    title: "地元の現場で長く働く",
    desc: "全国の建設業求人を網羅。あなたの街の現場と出会えます。",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1000&q=70",
  },
]

// 8 カテゴリ。Unsplash の建設業ストック写真をカード上部に配置し、
// 画像読み込み失敗時のフォールバックとして bg グラデーションを下に敷く。
const categories: Array<{
  key: string
  label: string
  sub: string
  image: string
  bg: string
}> = [
  {
    key: "construction",
    label: "建築・躯体",
    sub: "鳶 / 型枠 / 鉄筋 / 大工",
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=70",
    bg: "from-amber-400 to-amber-600",
  },
  {
    key: "civil",
    label: "土木",
    sub: "土工 / 重機オペ / 舗装",
    image:
      "https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=600&q=70",
    bg: "from-orange-400 to-orange-600",
  },
  {
    key: "electrical",
    label: "電気・設備",
    sub: "電工 / 配管 / 空調",
    image:
      "https://images.unsplash.com/photo-1621905251918-48416bd8575a?auto=format&fit=crop&w=600&q=70",
    bg: "from-blue-400 to-blue-600",
  },
  {
    key: "interior",
    label: "内装・仕上げ",
    sub: "クロス / 塗装 / 左官",
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=70",
    bg: "from-emerald-400 to-emerald-600",
  },
  {
    key: "demolition",
    label: "解体・産廃",
    sub: "解体 / アスベスト",
    image:
      "https://images.unsplash.com/photo-1574359411659-15573a27fd0c?auto=format&fit=crop&w=600&q=70",
    bg: "from-stone-500 to-stone-700",
  },
  {
    key: "driver",
    label: "ドライバー・重機",
    sub: "ダンプ / トレーラー",
    image:
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=70",
    bg: "from-cyan-400 to-cyan-600",
  },
  {
    key: "management",
    label: "施工管理",
    sub: "現場監督 / 工程",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=70",
    bg: "from-indigo-400 to-indigo-600",
  },
  {
    key: "survey",
    label: "測量・設計",
    sub: "測量士 / CAD",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=70",
    bg: "from-purple-400 to-purple-600",
  },
]

const popularAreas = [
  { pref: "東京", slug: "tokyo" },
  { pref: "神奈川", slug: "kanagawa" },
  { pref: "埼玉", slug: "saitama" },
  { pref: "千葉", slug: "chiba" },
  { pref: "大阪", slug: "osaka" },
  { pref: "愛知", slug: "aichi" },
  { pref: "福岡", slug: "fukuoka" },
  { pref: "兵庫", slug: "hyogo" },
  { pref: "北海道", slug: "hokkaido" },
  { pref: "京都", slug: "kyoto" },
  { pref: "宮城", slug: "miyagi" },
  { pref: "広島", slug: "hiroshima" },
]

// マイナビ「働き方から探す」相当。クリックで /jobs にキーワードクエリで遷移。
const WORK_STYLES: Array<{ icon: typeof Sparkles; label: string; q: string; color: string }> = [
  { icon: GraduationCap, label: "未経験 OK", q: "未経験", color: "text-blue-600 bg-blue-50" },
  { icon: HomeIcon, label: "寮・社宅完備", q: "寮", color: "text-emerald-600 bg-emerald-50" },
  { icon: Award, label: "資格取得支援", q: "資格", color: "text-amber-600 bg-amber-50" },
  { icon: CalendarDays, label: "週休 2 日", q: "週休2日", color: "text-purple-600 bg-purple-50" },
  { icon: TrendingUp, label: "高収入", q: "高収入", color: "text-rose-600 bg-rose-50" },
  { icon: Users, label: "若手活躍中", q: "若手", color: "text-cyan-600 bg-cyan-50" },
]

export default async function HomePage() {
  const baseConstructionFilter = {
    status: "active" as const,
    category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
  }

  // ビルド時 / SSR 時に Supabase が一時的に遅い（statement_timeout が
  // 効くケース）でもビルドが落ちないよう、各クエリに 8 秒上限を被せる。
  // ホームは ISR 24h でキャッシュされるため、warmup cron による次回再生成で
  // 正しい値に上書きされる。
  const DB_DEADLINE_MS = 8000

  const [
    categoryCounts,
    recommendedJobs,
    magazineArticles,
    interviewArticles,
  ] = await Promise.all([
    // materialized view から件数を取得（未作成時は groupBy にフォールバック）
    withTimeout(getCategoryCounts(), DB_DEADLINE_MS, [], "getCategoryCounts"),
    withTimeout(
      // 同一企業の連続表示を抑制するため candidate を 3 倍 (18 件) 取り、
      // diversifyByCompany で再配置 → 上位 6 件に絞る
      prisma.job
      .findMany({
        where: baseConstructionFilter,
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
        take: 18,
        select: {
          id: true,
          title: true,
          category: true,
          prefecture: true,
          city: true,
          salaryMin: true,
          salaryMax: true,
          salaryType: true,
          tags: true,
          companyId: true,
          company: { select: { name: true } },
        },
      })
      // rank_score 未反映でも落ちないようフォールバック
      .catch(async () =>
        prisma.job
          .findMany({
            where: baseConstructionFilter,
            orderBy: { publishedAt: "desc" },
            take: 18,
            select: {
              id: true,
              title: true,
              category: true,
              prefecture: true,
              city: true,
              salaryMin: true,
              salaryMax: true,
              salaryType: true,
              tags: true,
              companyId: true,
              company: { select: { name: true } },
            },
          })
          .catch(() => [])
      ),
      DB_DEADLINE_MS,
      [],
      "recommendedJobs"
    ),
    withTimeout(
      prisma.article
        .findMany({
          where: { ...publishedArticleFilter(), category: { not: "interview" } },
          orderBy: { publishedAt: "desc" },
          take: 4,
          select: { slug: true, title: true, category: true, publishedAt: true, imageUrl: true },
        })
        .catch(() => []),
      DB_DEADLINE_MS,
      [],
      "magazineArticles"
    ),
    withTimeout(
      prisma.article
        .findMany({
          where: { ...publishedArticleFilter(), category: "interview" },
          orderBy: { publishedAt: "desc" },
          take: 4,
          select: { slug: true, title: true, publishedAt: true, imageUrl: true },
        })
        .catch(() => []),
      DB_DEADLINE_MS,
      [],
      "interviewArticles"
    ),
  ])

  // A4: 同一企業の連続表示を抑制した上で、表示用 6 件に絞る
  const diversifiedRecommendedJobs = diversifyByCompany(recommendedJobs).slice(0, 6)

  const totalJobs = categoryCounts.reduce((sum, c) => sum + c.count, 0)
  const categoriesWithCounts = categories.map((c) => ({
    ...c,
    count: categoryCounts.find((cc) => cc.category === c.key)?.count ?? 0,
  }))

  return (
    <div className="bg-white">
      {/* === Hero（建設現場写真 + 検索）======================================= */}
      <section className="relative isolate overflow-hidden bg-ink-900 text-white">
        {/* 背景写真は装飾。クリックを吸わせない */}
        <Image
          src={HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-55 pointer-events-none select-none"
        />
        <div aria-hidden className="hero-stripe-top pointer-events-none" />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-ink-900/95 via-ink-900/70 to-ink-900/30 pointer-events-none" />

        {/* コンテンツは必ず最前面（フォーム/ボタンのクリックを確実に通す） */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14 sm:py-24">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 bg-brand-yellow-500 text-ink-900 px-3 py-1 text-xs font-extrabold">
              <Sparkles className="h-3.5 w-3.5" />
              20〜30 代の若手も活躍中
            </p>
            <h1 className="mt-4 text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight drop-shadow-lg">
              建設業の求人を、
              <br className="hidden sm:block" />
              <span className="text-brand-yellow-300">スマホで気軽に探せる</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-white/95 leading-relaxed drop-shadow">
              {totalJobs > 0 ? `${totalJobs.toLocaleString()}件の求人を掲載中。` : "全国の建設業求人を掲載中。"}
              履歴書なし、LINE で気軽に応募できます。
            </p>

            {/* 検索フォーム — 白パネルを浮かせて視覚階層を強化 */}
            <form action="/jobs" className="mt-7" role="search">
              <div className="flex flex-col gap-2 bg-white p-3 shadow-2xl border-l-4 border-brand-yellow-500 sm:flex-row sm:items-stretch sm:p-2 sm:gap-2">
                <label className="flex items-center gap-2 flex-1 min-w-0 px-3 py-1 sm:py-0">
                  <Search className="h-5 w-5 text-primary-500 shrink-0" aria-hidden />
                  <span className="sr-only">職種・キーワード</span>
                  <input
                    type="text"
                    name="q"
                    placeholder="職種・キーワード（例: 鳶、施工管理）"
                    className="h-11 flex-1 min-w-0 bg-transparent text-base text-gray-900 placeholder:text-gray-400 focus:outline-none"
                    autoComplete="off"
                  />
                </label>
                <button
                  type="submit"
                  className="press inline-flex h-12 items-center justify-center gap-1.5 bg-primary-600 px-6 text-base font-extrabold text-white shadow hover:bg-primary-700 sm:h-auto sm:min-w-[160px]"
                >
                  <Search className="h-5 w-5" aria-hidden />
                  求人を探す
                </button>
              </div>
              {/* よく使われる絞り込み（クイックチップ） */}
              <ul className="mt-3 flex flex-wrap gap-2">
                {[
                  { label: "未経験OK", q: "未経験" },
                  { label: "資格取得支援", q: "資格" },
                  { label: "寮あり", q: "寮" },
                  { label: "週休2日", q: "週休2日" },
                  { label: "日払い", q: "日払い" },
                ].map((c) => (
                  <li key={c.q}>
                    <Link
                      href={`/jobs?q=${encodeURIComponent(c.q)}`}
                      className="press inline-flex items-center bg-white/15 hover:bg-white/25 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-sm border border-white/30"
                    >
                      #{c.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </form>
          </div>
        </div>
        <div aria-hidden className="hero-stripe-bottom pointer-events-none" />
      </section>

      {/* === 注目特集（写真バナー 3 つ）======================================== */}
      <Section size="md">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 section-bar">
          注目特集
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {FEATURE_BANNERS.map((b, i) => (
            <Link
              key={b.title}
              href={b.href}
              className="press group relative block overflow-hidden border border-gray-200 bg-ink-900 hover:border-primary-400 transition"
            >
              <div className="relative aspect-[16/10]">
                <Image
                  src={b.image}
                  alt=""
                  fill
                  // モバイルでは 1 番目が above-the-fold に入ることが多いので
                  // 1 番目のみ priority、他は lazy。
                  priority={i === 0}
                  loading={i === 0 ? undefined : "lazy"}
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover opacity-70 group-hover:opacity-80 group-hover:scale-105 transition duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span className="inline-block bg-brand-yellow-500 text-ink-900 px-2 py-0.5 text-xs font-extrabold tracking-wide">
                    {b.badge}
                  </span>
                  <p className="mt-2 text-base font-extrabold text-white leading-tight drop-shadow">
                    {b.title}
                  </p>
                  <p className="mt-1 text-xs text-white/85 leading-relaxed line-clamp-2">
                    {b.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* === 職種から探す ===================================================== */}
      <Section variant="warm" bordered>
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 section-bar">
            職種から探す
          </h2>
          <p className="text-xs text-gray-500">8 カテゴリ</p>
        </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {categoriesWithCounts.map(({ key, label, sub, image, bg, count }) => (
              <Link
                key={key}
                href={`/jobs?category=${key}`}
                className="press group relative block overflow-hidden bg-ink-900 shadow-sm hover:shadow-md transition"
              >
                {/* フォールバック用色グラデ + 写真を重ねる */}
                <div className={`relative aspect-[4/3] sm:aspect-[16/11] bg-gradient-to-br ${bg}`}>
                  <Image
                    src={image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover opacity-75 group-hover:opacity-85 group-hover:scale-[1.03] transition duration-300"
                  />
                  {/* テキスト可読性のための暗グラデ (注目特集と統一) */}
                  <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink-900/95 via-ink-900/40 to-transparent"
                  />
                  {/* 件数バッジ (右上) */}
                  <span className="absolute top-2 right-2 inline-flex items-center bg-brand-yellow-500 text-ink-900 px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                    {count.toLocaleString()} 件
                  </span>
                  {/* 写真の上にテキストを重ねる */}
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <p className="text-base font-extrabold text-white leading-tight drop-shadow">
                      {label}
                    </p>
                    <p className="mt-1 text-[11px] text-white/85 leading-relaxed line-clamp-1">
                      {sub}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
      </Section>

      {/* === 働き方から探す（マイナビ「働き方から探す」相当）================== */}
      <Section size="md">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 section-bar">
          働き方から探す
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {WORK_STYLES.map(({ icon: Icon, label, q, color }) => (
            <Link
              key={q}
              href={`/jobs?q=${encodeURIComponent(q)}`}
              className="press card flex flex-col items-center gap-2 p-4 text-center"
            >
              <span className={`inline-flex h-10 w-10 items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-xs font-bold text-gray-700 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* === あなたへのおすすめ (匿名 JobView から差し込み) =================== */}
      <Section bordered size="md">
        <RecommendedForYou limit={6} />
      </Section>

      {/* === 注目の求人ランキング ============================================== */}
      {diversifiedRecommendedJobs.length > 0 && (
        <Section variant="warm" bordered>
          <div className="flex items-end justify-between mb-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 section-bar">
              注目の求人ランキング
            </h2>
              <Link
                href="/jobs"
                className="press inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
              >
                すべて見る
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {diversifiedRecommendedJobs.map((job, i) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="press group relative accent-l card p-4 pl-5"
                >
                  <span className="absolute top-2 right-2 inline-flex h-6 w-6 items-center justify-center bg-primary-600 text-xs font-extrabold text-white">
                    {i + 1}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-primary-600 pr-7">
                    {job.title}
                  </h3>
                  {job.company && (
                    <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                      <Building2 className="inline h-3 w-3 mr-1 text-gray-400" />
                      {job.company.name}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1 text-primary-700 font-bold">
                      <Banknote className="h-3.5 w-3.5" />
                      {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-gray-600">
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      {job.prefecture}
                      {job.city ? ` ${job.city}` : ""}
                    </span>
                  </div>
                  {job.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {job.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="inline-flex items-center border border-primary-200 bg-white px-1.5 py-0.5 text-xs text-primary-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </Link>
              ))}
            </div>
        </Section>
      )}

      {/* === 都道府県から探す ================================================== */}
      <Section size="md">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 section-bar">
          都道府県から探す
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {popularAreas.map((a) => (
            <Link
              key={a.slug}
              href={`/${a.slug}`}
              className="press card-flat flex items-center justify-center px-3 py-3 text-sm font-medium text-gray-700 hover:text-primary-700"
            >
              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
              {a.pref}
            </Link>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-600">
          全 47 都道府県の求人ページがあります。
          <Link href="/jobs" className="ml-1 text-primary-700 underline underline-offset-2 hover:no-underline">
            検索ページから他県も見る →
          </Link>
        </p>
      </Section>

      {/* === お役立ちコンテンツ（マガジン + 体験談）=========================== */}
      <Section variant="warm" bordered>
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-6 section-bar">
          お役立ちコンテンツ
        </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* マガジン */}
            <div className="bg-white border accent-t p-5">
              <div className="flex items-end justify-between mb-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <Newspaper className="h-5 w-5 text-primary-500" />
                  マガジン
                </h3>
                <Link
                  href="/journal"
                  className="text-sm text-primary-600 hover:underline font-medium"
                >
                  すべて見る →
                </Link>
              </div>
              <ul className="space-y-2">
                {magazineArticles.length === 0 ? (
                  <li className="text-sm text-gray-500">準備中です。</li>
                ) : (
                  magazineArticles.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/journal/${a.slug}`}
                        className="press group flex gap-3 border border-gray-100 bg-white p-2 hover:border-primary-300 transition"
                      >
                        {a.imageUrl && (
                          <div className="relative h-14 w-20 shrink-0 overflow-hidden bg-gray-100">
                            <Image
                              src={a.imageUrl}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-primary-600 uppercase tracking-wide">
                            {CATEGORY_LABELS[a.category] ?? a.category}
                          </p>
                          <p className="mt-0.5 text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600">
                            {a.title}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* 転職体験談 */}
            <div className="bg-white border accent-t p-5">
              <div className="flex items-end justify-between mb-4">
                <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                  <MessageCircle className="h-5 w-5 text-primary-500" />
                  転職体験談
                </h3>
                <Link
                  href="/journal?category=interview"
                  className="text-sm text-primary-600 hover:underline font-medium"
                >
                  すべて見る →
                </Link>
              </div>
              <ul className="space-y-2">
                {interviewArticles.length === 0 ? (
                  <li className="text-sm text-gray-500">準備中です。</li>
                ) : (
                  interviewArticles.map((a) => (
                    <li key={a.slug}>
                      <Link
                        href={`/journal/${a.slug}`}
                        className="press group flex gap-3 border border-gray-100 bg-white p-2 hover:border-primary-300 transition"
                      >
                        {a.imageUrl && (
                          <div className="relative h-14 w-20 shrink-0 overflow-hidden bg-gray-100">
                            <Image
                              src={a.imageUrl}
                              alt=""
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600">
                            {a.title}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
      </Section>

      {/* === CTA ============================================================== */}
      <section className="bg-gradient-to-r from-primary-600 to-orange-700 text-white">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-10 text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight">
            気になる求人があれば、まずは LINE で話を聞く。
          </h2>
          <p className="mt-2 text-sm sm:text-base text-white/90">
            履歴書も会員登録も不要。匿名でも質問できます。
          </p>
          <Link
            href="/jobs"
            className="press mt-6 inline-flex items-center gap-2 bg-white px-8 py-3 text-base font-extrabold text-primary-700 shadow-lg hover:bg-yellow-50 transition"
          >
            <Search className="h-5 w-5" />
            求人を探してみる
          </Link>
        </div>
      </section>
    </div>
  )
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  if (!min) return "応相談"
  const unit =
    type === "hourly"
      ? "時給"
      : type === "annual"
        ? "年収"
        : type === "daily"
          ? "日給"
          : "月給"
  const useManYen = type !== "hourly" && type !== "daily"
  const fmt = (n: number) =>
    useManYen && n >= 10000
      ? `${(n / 10000).toFixed(0)}万`
      : `${n.toLocaleString()}`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  return `${unit} ${fmt(min)}円〜`
}
