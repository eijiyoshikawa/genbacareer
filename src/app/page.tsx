import Link from "next/link"
import Image from "next/image"
import { buildPublicJobOrderBy } from "@/lib/job-sort"
import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES, getCategoryLabel } from "@/lib/categories"
import { publishedArticleFilter } from "@/lib/articles"
import { withTimeout } from "@/lib/with-timeout"
import { diversifyByCompany } from "@/lib/job-diversify"
import {
  Search,
  Building2,
  ArrowRight,
  MapPin,
  Banknote,
} from "lucide-react"
import {
  HardHat,
  Mountains,
  Lightning,
  PaintBrush,
  Hammer,
  Truck,
  ClipboardText,
  Ruler,
  Wrench,
} from "@phosphor-icons/react/dist/ssr"
import { CATEGORY_LABELS } from "@/lib/article-categories"
import { RecommendedForYou } from "@/components/jobs/recommended-for-you"
import { Section } from "@/components/ui/section"
import { getCategoryCounts } from "@/lib/job-stats"
import { HeroSlideshow, type HeroSlide } from "@/components/home/hero-slideshow"
import { QuickSearchPanel } from "@/components/home/quick-search-panel"
import {
  FeaturedCompanyLogos,
  type FeaturedCompany,
} from "@/components/home/featured-company-logos"
import { MemberCta } from "@/components/home/member-cta"
import { HomeSidebar } from "@/components/home/home-sidebar"
import { AnnounceMarquee } from "@/components/home/announce-marquee"
import { SeoFooterLinks } from "@/components/home/seo-footer-links"
import { SalaryStats, type SalaryStatRow } from "@/components/home/salary-stats"
import { LineLoginButton } from "@/components/auth/line-login-button"
import type { Metadata } from "next"

// ホームは ISR で 24 時間キャッシュ。/api/cron/warmup が 5 分おきに叩いて
// CDN キャッシュとラムダをウォームに保つため、PageSpeed や初回訪問でも
// コールド lambda の 5 秒待ちが発生しない。
// 新着求人 / 記事の公開時は src/lib/revalidate-public.ts 経由で
// 自動的に revalidatePath('/') が呼ばれるので、24h 待たずに即時反映される。
export const revalidate = 86400

export const metadata: Metadata = {
  title: "ゲンバキャリア | 今、稼げる建設業界で新しい自分を",
  description:
    "未経験から高収入も狙える、今話題の建設業界。建築・土木・電気・内装・解体・ドライバー・施工管理・測量の求人を探せる求人サイト。履歴書なし、LINE で気軽に応募。",
  alternates: { canonical: "/" },
}

// Hero スライドショー用の見本データ。
// あとから運営側で差し替え運用する想定。本番では cms / 設定パネル化を検討。
const HERO_SLIDES: HeroSlide[] = [
  {
    image:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1800&q=72",
    badge: "今、稼げる業界",
    title: "稼げる業界で、新しい自分を見つけませんか。",
    subtitle:
      "未経験から高収入も狙える建設業界。履歴書なし、LINE で気軽に応募できます。",
    ctaLabel: "求人を探す",
    ctaHref: "/jobs",
  },
  {
    image:
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1800&q=72",
    badge: "未経験から高収入",
    title: "未経験スタートでも、しっかり稼げる。",
    subtitle:
      "20〜30 代が未経験から活躍中。研修・資格支援が充実した会社を厳選しました。",
    ctaLabel: "未経験 OK の求人",
    ctaHref: "/jobs?q=未経験",
  },
  {
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1800&q=72",
    badge: "手に職・国家資格",
    title: "資格を取って、収入も自分も伸ばす。",
    subtitle:
      "施工管理技士・電気工事士・玉掛けなど、会社負担で取得できる求人を厳選。",
    ctaLabel: "資格支援ありの求人",
    ctaHref: "/jobs?q=資格",
  },
  {
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1800&q=72",
    badge: "全国 47 都道府県",
    title: "地元で、安定して長く稼ぐ。",
    subtitle: "全国の求人を網羅。あなたの街で好条件の現場と出会えます。",
    ctaLabel: "地域から探す",
    ctaHref: "/jobs",
  },
]

// トップ「お知らせ」プレースホルダー (運用が始まったら CMS / DB から取得に切替)
const ANNOUNCEMENTS: Array<{ date: string; label: string; href?: string }> = [
  {
    date: "2026-05-20",
    label: "採用決定でお祝い金がもらえる「ハイヤリングボーナス」を開始しました。",
    href: "/journal",
  },
  {
    date: "2026-05-10",
    label: "企業様向けに Google カレンダー連携 (面接日時の自動共有) をリリースしました。",
  },
  {
    date: "2026-05-01",
    label: "ゲンバキャリアが建設業特化求人サイトとして本日正式オープンしました。",
  },
]

// 「様々な切り口から探す」テーマ別バナー (注目特集 とは違う切り口)
// 画像読み込み失敗時のフォールバックとして bg グラデーションを下に敷く
const THEMED_BUCKETS: Array<{
  label: string
  desc: string
  query: string
  image: string
  bg: string
}> = [
  {
    label: "寮・社宅完備",
    desc: "住み込みでスタートしたい方に。",
    query: "寮",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1000&q=70",
    bg: "from-emerald-500 to-emerald-700",
  },
  {
    label: "直行直帰OK",
    desc: "通勤の負担を最小化。",
    query: "直行直帰",
    image:
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=1000&q=70",
    bg: "from-blue-500 to-blue-700",
  },
  {
    label: "年収 500 万円〜",
    desc: "高収入の現場リーダー候補。",
    query: "高収入",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=70",
    bg: "from-rose-500 to-rose-700",
  },
  {
    label: "週休 2 日",
    desc: "プライベートも大切に。",
    query: "週休2日",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=1000&q=70",
    bg: "from-violet-500 to-violet-700",
  },
  {
    label: "資格取得支援",
    desc: "会社負担でキャリアアップ。",
    query: "資格",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=1000&q=70",
    bg: "from-amber-500 to-amber-700",
  },
  {
    label: "経験者優遇",
    desc: "現場リーダー / 監督候補。",
    query: "経験者",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=1000&q=70",
    bg: "from-cyan-600 to-cyan-800",
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
// 写真をカード背景に配置し、テキストは下部にオーバーレイ。bg は写真読み込み
// 失敗時のフォールバック用グラデーション。
const WORK_STYLES: Array<{
  label: string
  q: string
  image: string
  bg: string
}> = [
  {
    label: "未経験 OK",
    q: "未経験",
    image:
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=800&q=70",
    bg: "from-blue-500 to-blue-700",
  },
  {
    label: "寮・社宅完備",
    q: "寮",
    image:
      "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70",
    bg: "from-emerald-500 to-emerald-700",
  },
  {
    label: "資格取得支援",
    q: "資格",
    image:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=800&q=70",
    bg: "from-amber-500 to-amber-700",
  },
  {
    label: "週休 2 日",
    q: "週休2日",
    image:
      "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=70",
    bg: "from-purple-500 to-purple-700",
  },
  {
    label: "高収入",
    q: "高収入",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=800&q=70",
    bg: "from-rose-500 to-rose-700",
  },
  {
    label: "若手活躍中",
    q: "若手",
    image:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=800&q=70",
    bg: "from-cyan-600 to-cyan-800",
  },
]

// 職種カテゴリ → アイコン（チップ表示用）
const CATEGORY_ICONS: Record<string, typeof HardHat> = {
  construction: HardHat,
  civil: Mountains,
  electrical: Lightning,
  interior: PaintBrush,
  demolition: Hammer,
  driver: Truck,
  management: ClipboardText,
  survey: Ruler,
}

// TOP に置く「人気のこだわり条件」チップ
const POPULAR_CONDITIONS: string[] = [
  "未経験歓迎",
  "土日祝休み",
  "週休2日",
  "寮・社宅あり",
  "資格取得支援",
  "日払い・週払い",
  "高収入",
  "学歴不問",
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
    featuredCompanies,
  ] = await Promise.all([
    // materialized view から件数を取得（未作成時は groupBy にフォールバック）
    withTimeout(getCategoryCounts(), DB_DEADLINE_MS, [], "getCategoryCounts"),
    withTimeout(
      // 同一企業の連続表示を抑制するため candidate を 3 倍 (18 件) 取り、
      // diversifyByCompany で再配置 → 上位 6 件に絞る
      prisma.job
      .findMany({
        where: baseConstructionFilter,
        orderBy: buildPublicJobOrderBy("recommended"),
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
          imageUrls: true,
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
              imageUrls: true,
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
          take: 5,
          select: { slug: true, title: true, publishedAt: true, imageUrl: true },
        })
        .catch(() => []),
      DB_DEADLINE_MS,
      [],
      "interviewArticles"
    ),
    // 注目企業ロゴグリッド用: 認定 (approved + direct) 企業のうち logoUrl 持ち上位 10 社
    withTimeout(
      prisma.company
        .findMany({
          where: {
            status: "approved",
            source: "direct",
            logoUrl: { not: null },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
          select: { id: true, name: true, logoUrl: true },
        })
        .catch(() => [] as FeaturedCompany[]),
      DB_DEADLINE_MS,
      [] as FeaturedCompany[],
      "featuredCompanies",
    ),
  ])

  // A4: 同一企業の連続表示を抑制した上で、表示用 6 件に絞る
  // メインのランキングは 6 件、サイドバー「注目求人」は 7 件使うため余裕を持って確保
  const diversifiedRecommendedJobs = diversifyByCompany(recommendedJobs).slice(0, 8)

  // 職種別の平均月給（給与相場グラフ用）。月給制・提示額ありの公開求人から算出。
  const salaryAgg = await withTimeout(
    prisma.job
      .groupBy({
        by: ["category"],
        where: {
          status: "active",
          salaryType: "monthly",
          category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
          salaryMin: { gt: 0 },
        },
        _avg: { salaryMin: true, salaryMax: true },
        _count: { _all: true },
      })
      .catch(() => [] as never[]),
    DB_DEADLINE_MS,
    [] as never[],
    "salaryByCategory",
  )
  const salaryStatRows: SalaryStatRow[] = (
    salaryAgg as Array<{
      category: string
      _avg: { salaryMin: number | null; salaryMax: number | null }
      _count: { _all: number }
    }>
  )
    .filter((r) => (r._avg.salaryMin ?? 0) > 0)
    .map((r) => ({
      category: r.category,
      label: getCategoryLabel(r.category),
      avgMin: Math.round(r._avg.salaryMin ?? 0),
      avgMax: Math.round(r._avg.salaryMax ?? r._avg.salaryMin ?? 0),
      count: r._count._all,
    }))
    .sort((a, b) => b.avgMax - a.avgMax)

  const totalJobs = categoryCounts.reduce((sum, c) => sum + c.count, 0)
  const categoriesWithCounts = categories.map((c) => ({
    ...c,
    count: categoryCounts.find((cc) => cc.category === c.key)?.count ?? 0,
  }))

  return (
    <div className="bg-white">
      {/* === Hero スライドショー ============================================== */}
      <HeroSlideshow slides={HERO_SLIDES} />

      {/* === 3 軸クイック検索パネル =========================================== */}
      <QuickSearchPanel totalJobs={totalJobs} />

      {/* === お知らせ（1 行マーキー）======================================== */}
      <AnnounceMarquee items={ANNOUNCEMENTS} />

      {/* === 注目企業ピックアップ (logoUrl のある認定企業を最大 10 社) =========== */}
      <FeaturedCompanyLogos companies={featuredCompanies} />

      {/* === 様々な切り口から探す (テーマ別バナー) ============================ */}
      <Section size="md">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 section-bar">
          様々な切り口から探す
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {THEMED_BUCKETS.map((b) => (
            <Link
              key={b.label}
              href={`/jobs?q=${encodeURIComponent(b.query)}`}
              className="press group relative block overflow-hidden bg-ink-900 shadow-sm hover:shadow-md transition"
            >
              <div className={`relative aspect-[16/9] bg-gradient-to-br ${b.bg}`}>
                <Image
                  src={b.image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover opacity-75 group-hover:opacity-85 group-hover:scale-[1.03] transition duration-300"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/40 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <p className="text-base sm:text-lg font-extrabold text-white leading-tight drop-shadow">
                    {b.label}
                  </p>
                  <p className="mt-1 text-xs text-white/85 leading-snug drop-shadow">
                    {b.desc}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      {/* === 会員登録誘導 ==================================================== */}
      <MemberCta />

      {/* === 以下 2 カラム (PC) / 1 カラム (SP) ================================= */}
      <div className="bg-warm-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12 grid gap-6 lg:gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <main className="min-w-0 space-y-8 sm:space-y-10">

      {/* === 勤務地から探す ================================================== */}
      <section className="card-elevated p-5 sm:p-6 bg-white">
        <div className="mb-6 flex items-center justify-between gap-3">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 section-bar">
            勤務地から探す
          </h2>
          <Link
            href="/jobs/map"
            className="press inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm transition hover:bg-primary-700"
          >
            <MapPin className="h-4 w-4" />
            地図から探す
          </Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
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
      </section>

      {/* === 働き方から探す ================================================== */}
      <section className="card-elevated p-5 sm:p-6 bg-white">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-5 section-bar">
          働き方から探す
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {WORK_STYLES.map(({ label, q, image, bg }) => (
            <Link
              key={q}
              href={`/jobs?q=${encodeURIComponent(q)}`}
              className="press group relative block overflow-hidden bg-ink-900 shadow-sm hover:shadow-md transition"
            >
              <div className={`relative aspect-[16/9] bg-gradient-to-br ${bg}`}>
                <Image
                  src={image}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover opacity-75 group-hover:opacity-85 group-hover:scale-[1.03] transition duration-300"
                />
                <div
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-ink-900/85 via-ink-900/30 to-transparent"
                />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="text-sm sm:text-base font-extrabold text-white leading-tight drop-shadow">
                    {label}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* 人気のこだわり条件チップ */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs font-bold text-gray-500">
            人気のこだわり条件
          </span>
          {POPULAR_CONDITIONS.map((q) => (
            <Link
              key={q}
              href={`/jobs?q=${encodeURIComponent(q)}`}
              className="press rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-700 transition hover:border-primary-400 hover:text-primary-700"
            >
              {q}
            </Link>
          ))}
        </div>
      </section>

      {/* === 職種から探す ===================================================== */}
      <section className="card-elevated p-5 sm:p-6 bg-white">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 section-bar">
            職種から探す
          </h2>
          <p className="text-xs text-gray-500">8 カテゴリ</p>
        </div>

          {/* リクナビ風: アイコン + テキストのチップ */}
          <div className="flex flex-wrap gap-2.5">
            {categoriesWithCounts.map(({ key, label, count }) => {
              const Icon = CATEGORY_ICONS[key] ?? Wrench
              return (
                <Link
                  key={key}
                  href={`/jobs?category=${key}`}
                  className="press inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-800 shadow-sm transition hover:border-primary-400 hover:text-primary-700"
                >
                  <Icon weight="duotone" className="h-5 w-5 text-primary-600" />
                  {label}
                  <span className="text-[11px] font-medium text-gray-400">
                    {count.toLocaleString()}
                  </span>
                </Link>
              )
            })}
          </div>
      </section>

      {/* === あなたへのおすすめ (匿名 JobView から差し込み) =================== */}
      <section className="card-elevated p-5 sm:p-6 bg-white">
        <RecommendedForYou limit={6} />
      </section>

      {/* === 注目の求人ランキング ============================================== */}
      {diversifiedRecommendedJobs.length > 0 && (
        <section className="card-elevated p-5 sm:p-6 bg-white">
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
              {diversifiedRecommendedJobs.slice(0, 6).map((job, i) => (
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
        </section>
      )}

      {/* === 給与相場グラフ（職種別平均月給）================================ */}
      <SalaryStats rows={salaryStatRows} />

      {/* === お役立ちマガジン =================================================== */}
      <section className="card-elevated p-5 sm:p-6 bg-white">
        <div className="flex items-end justify-between mb-4">
          <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900 section-bar">
            お役立ちマガジン
          </h2>
          <Link
            href="/journal"
            className="text-sm text-primary-600 hover:underline font-medium"
          >
            すべて見る →
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {magazineArticles.length === 0 ? (
            <p className="text-sm text-gray-500">準備中です。</p>
          ) : (
            magazineArticles.map((a) => (
              <Link
                key={a.slug}
                href={`/journal/${a.slug}`}
                className="press card group flex gap-3 p-3"
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
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-primary-600 uppercase tracking-wide">
                    {CATEGORY_LABELS[a.category] ?? a.category}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 leading-snug">
                    {a.title}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

          </main>

          {/* === サイドバー (PC のみ、SP は main の下に重ねる) ================
              現場インタビューは全幅セクションへ移したため空配列を渡す。
              余白(謎の空白)を避けるため sticky + self-start で高さを内容に合わせる。 */}
          <div className="self-start lg:sticky lg:top-24">
            <HomeSidebar
              featuredJobs={diversifiedRecommendedJobs}
              interviewArticles={[]}
              announcements={ANNOUNCEMENTS}
            />
          </div>
        </div>
      </div>

      {/* === 現場インタビュー（全幅）======================================= */}
      {interviewArticles.length > 0 && (
        <Section size="md">
          <div className="flex items-end justify-between mb-5">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 section-bar">
              現場インタビュー
            </h2>
            <Link
              href="/journal?category=interview"
              className="text-sm font-bold text-primary-600 hover:text-primary-700"
            >
              すべて見る →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {interviewArticles.map((a) => (
              <Link
                key={a.slug}
                href={`/journal/${a.slug}`}
                className="press card group block overflow-hidden"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                  {a.imageUrl ? (
                    <Image
                      src={a.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition duration-300 group-hover:scale-105"
                      unoptimized={
                        !a.imageUrl.startsWith("/") &&
                        !a.imageUrl.includes("supabase.co")
                      }
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-gray-900 line-clamp-3 leading-snug group-hover:text-primary-700">
                    {a.title}
                  </p>
                  {a.publishedAt && (
                    <p className="mt-1 text-[10px] text-gray-400">
                      {new Date(a.publishedAt).toLocaleDateString("ja-JP")}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* === 最終 CTA（LINE 訴求・大幅刷新）===================================== */}
      <section className="relative overflow-hidden bg-brand-gradient text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-2xl"
        />
        <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center">
          <p className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur">
            今、稼げる業界へ
          </p>
          <h2 className="mt-3 text-2xl sm:text-4xl font-black leading-tight tracking-tight">
            未経験から、新しい自分を。
            <br />
            「稼げる」キャリアを今日から。
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-sm sm:text-base text-white/90 leading-relaxed">
            履歴書なし・LINE で 1 タップ応募。匿名で「話を聞くだけ」もOK。
            気になる現場に、今すぐ一歩を踏み出せます。
          </p>
          <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm font-bold">
            <li>✓ 履歴書なし</li>
            <li>✓ LINE で完結</li>
            <li>✓ 現職バレ防止</li>
          </ul>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="w-full sm:w-auto sm:min-w-[260px]">
              <LineLoginButton
                label="LINE で 1 タップ登録"
                callbackUrl="/mypage"
                size="lg"
                fullWidth
              />
            </div>
            <Link
              href="/jobs"
              className="press inline-flex w-full items-center justify-center gap-2 bg-white px-8 py-3.5 text-base font-extrabold text-primary-700 shadow-lg transition hover:bg-orange-50 sm:w-auto"
            >
              <Search className="h-5 w-5" />
              求人を探す
            </Link>
          </div>
          <p className="mt-5 text-xs text-white/80">
            現在{" "}
            <span className="font-bold">{totalJobs.toLocaleString()}</span>{" "}
            件の求人を掲載中
          </p>
        </div>
      </section>

      {/* === 巨大 SEO フッター ============================================== */}
      <SeoFooterLinks />
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
