import { prisma } from "@/lib/db"
import { notFound, redirect, permanentRedirect } from "next/navigation"
import { headers } from "next/headers"
import Link from "next/link"
import { auth } from "@/lib/auth"
import {
  getGuestAccessibleJobIds,
  isCrawlerUserAgent,
} from "@/lib/guest-job-access"
import { JobViewBeacon } from "@/components/jobs/job-view-beacon"
import {
  MapPin,
  Money,
  Buildings,
  ArrowLeft,
  CaretRight,
  Briefcase,
  Globe,
  UsersThree,
  Megaphone,
  ShareNetwork,
  Factory,
  ClockCountdown,
} from "@phosphor-icons/react/dist/ssr"
import type { Metadata } from "next"
import {
  generateJobPostingSchema,
  generateBreadcrumbSchema,
  generateVideoObjectSchema,
} from "@/lib/structured-data"
import { getCategoryLabel } from "@/lib/categories"
import { groupTags } from "@/lib/job-enrichment"
import { JobDescription } from "@/components/jobs/job-description"
import { FormattedText } from "@/components/jobs/formatted-text"
import { generateRecommendation } from "@/lib/job-recommendation"
import { TagChip } from "@/components/jobs/tag-chip"
import { SectionHeading } from "@/components/jobs/section-heading"
import { AccordionSection } from "@/components/jobs/accordion-section"
import { JobInfoTable } from "@/components/jobs/job-info-table"
import { RightTocNav } from "@/components/jobs/right-toc-nav"
import { StickyActionBar } from "@/components/jobs/sticky-action-bar"
import { ReportButton } from "@/components/reports/report-button"
import { findRelatedJobs } from "@/lib/job-matching"
import { RelatedAreaCategoryLinks } from "@/components/jobs/related-area-category-links"
import { HeroBanner } from "@/components/jobs/hero-banner"
import { JobSpec } from "@/components/jobs/job-spec"
import { JobFaq } from "@/components/jobs/job-faq"
import { pickDefaultJobImage } from "@/lib/default-job-images"
import { SnsLinks } from "@/components/jobs/sns-links"
import { PhotoGallery } from "@/components/jobs/photo-gallery"
import { VideoGallery } from "@/components/jobs/video-gallery"
import { ClientErrorBoundary } from "@/components/error-boundary"
import { MapEmbed } from "@/components/jobs/map-embed"
import { isValidUuid } from "@/lib/uuid"

type Props = {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | undefined>>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  if (!isValidUuid(id)) return { title: "求人が見つかりません" }
  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      title: true,
      prefecture: true,
      category: true,
      status: true,
      dedupedTo: true,
    },
  })
  if (!job) return { title: "求人が見つかりません" }

  // 重複求人: canonical を正規ページに向ける（ページ本体で 301 リダイレクトもする）
  if (job.dedupedTo) {
    return {
      title: job.title,
      alternates: { canonical: `/jobs/${job.dedupedTo}` },
      robots: { index: false, follow: true },
    }
  }

  // 終了求人: インデックス対象から外す（既存ブックマーク用に表示はする）
  if (job.status === "closed") {
    return {
      title: `${job.title}（募集終了）`,
      description: `${job.prefecture}の${job.title}の求人は現在募集を終了しています。`,
      alternates: { canonical: `/jobs/${id}` },
      robots: { index: false, follow: true },
    }
  }

  return {
    title: job.title,
    description: `${job.prefecture}の${job.title}の求人詳細。ゲンバキャリアで建設業界の最新求人をチェック。`,
    alternates: { canonical: `/jobs/${id}` },
  }
}

export default async function JobDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  // 不正な UUID（メールアドレス等を ID 部分に放り込んだスクレイパー対策）。
  // Prisma に渡す前に弾いて 404 を返す。
  if (!isValidUuid(id)) notFound()
  const sp = (await searchParams) ?? {}
  const isPreview = sp.preview === "1"
  // 閲覧記録はクライアント beacon (<JobViewBeacon />) 経由で行う。
  // SSR 中に DB 書き込みを行わないことで、TTFB と将来の ISR 化を可能にする。

  // 詳細ページで実際に使うカラムだけを select する。
  // rawData (Hellowork 由来の Json 丸ごと格納) や dedupeKey 等は不要なので含めない。
  // viewCount は別途 increment で update するだけなので select 不要。
  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      category: true,
      employmentType: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      prefecture: true,
      city: true,
      address: true,
      benefits: true,
      tags: true,
      videoUrls: true,
      imageUrls: true,
      status: true,
      dedupedTo: true,
      source: true,
      helloworkId: true,
      publishedAt: true,
      expiresAt: true,
      validUntil: true,
      createdAt: true,
      occupationTitle: true,
      occupationCategoryName: true,
      industryCode: true,
      jobTypeName: true,
      jobConditionNotes: true,
      baseSalary: true,
      bonus: true,
      commuteAllowance: true,
      fixedOvertime: true,
      workHours: true,
      workHoursNotes: true,
      holidays: true,
      holidaysOther: true,
      annualHolidays: true,
      insurance: true,
      smokingPolicy: true,
      trialPeriod: true,
      requiredExperience: true,
      education: true,
      recruitmentCount: true,
      recruitmentReason: true,
      companyFeatures: true,
      businessContent: true,
      companyUrl: true,
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          prefecture: true,
          city: true,
          address: true,
          employeeCount: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
          tagline: true,
          pitchHighlights: true,
          idealCandidate: true,
          employeeVoice: true,
          photos: true,
          instagramUrl: true,
          tiktokUrl: true,
          facebookUrl: true,
          xUrl: true,
          youtubeUrl: true,
        },
      },
    },
  })

  if (!job) notFound()

  // 重複求人として close された場合: 正規ページへ 301 リダイレクト。
  // これがないと Google が「user-declared canonical と Google's choice が違う」と
  // 判定して Search Console で重複エラーとして大量計上される。
  if (job.dedupedTo) {
    permanentRedirect(`/jobs/${job.dedupedTo}`)
  }

  // 未登録ゲストは「グローバル上位 15 件（recommended sort / フィルタ無し）」の詳細のみ閲覧可。
  // 検索エンジン等のクローラは Google for Jobs SEO 維持のため除外する。
  const session = await auth().catch(() => null)
  if (!session?.user?.id && !isPreview) {
    const hdrs = await headers()
    const ua = hdrs.get("user-agent")
    if (!isCrawlerUserAgent(ua)) {
      const allowedIds = await getGuestAccessibleJobIds()
      if (!allowedIds.includes(id)) {
        redirect(`/login?callbackUrl=${encodeURIComponent(`/jobs/${id}`)}`)
      }
    }
  }

  // プレビューモードではトラッキングを行わない（社内チェックを実件数に混ぜないため）
  if (!isPreview) {
    prisma.job
      .update({ where: { id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {})
  }

  const jsonLd = generateJobPostingSchema({
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryType: job.salaryType,
    prefecture: job.prefecture,
    city: job.city,
    address: job.address,
    publishedAt: job.publishedAt,
    createdAt: job.createdAt,
    occupationCategoryName: job.occupationCategoryName,
    industryCode: job.industryCode,
    workHours: job.workHours,
    holidays: job.holidays,
    requiredExperience: job.requiredExperience,
    education: job.education,
    helloworkId: job.helloworkId,
    requirements: job.requirements,
    benefits: job.benefits,
    tags: job.tags,
    expiresAt: job.expiresAt,
    validUntil: job.validUntil,
    businessContent: job.businessContent,
    bonus: job.bonus,
    company: job.company
      ? {
          name: job.company.name,
          logoUrl: job.company.logoUrl,
          websiteUrl: job.company.websiteUrl,
        }
      : null,
  })

  const tagGroups = groupTags(job.tags)
  // tagline は企業がカスタム設定していればそれを優先、無ければ description から抽出
  const tagline = job.company?.tagline ?? extractTagline(job.description)

  const hasSalaryDetail = !!(
    job.baseSalary ||
    job.bonus ||
    job.commuteAllowance ||
    job.fixedOvertime
  )
  const hasBenefits = !!(job.trialPeriod || job.smokingPolicy)
  const hasRequirements = !!(
    job.requiredExperience ||
    job.education ||
    job.recruitmentCount ||
    job.recruitmentReason
  )
  const hasOccupationMeta = !!(
    job.occupationTitle ||
    job.occupationCategoryName ||
    job.jobTypeName
  )
  const validUntilInfo = computeValidUntilInfo(job.validUntil)
  const recommendation = generateRecommendation({
    title: job.title,
    category: job.category,
    prefecture: job.prefecture,
    city: job.city,
    address: job.address,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryType: job.salaryType,
    description: job.description,
    requirements: job.requirements,
    bonus: job.bonus,
    commuteAllowance: job.commuteAllowance,
    fixedOvertime: job.fixedOvertime,
    workHours: job.workHours,
    holidays: job.holidays,
    annualHolidays: job.annualHolidays,
    insurance: job.insurance,
    smokingPolicy: job.smokingPolicy,
    trialPeriod: job.trialPeriod,
    requiredExperience: job.requiredExperience,
    education: job.education,
  })

  const hasSns = !!(
    job.company?.instagramUrl ||
    job.company?.tiktokUrl ||
    job.company?.facebookUrl ||
    job.company?.xUrl ||
    job.company?.youtubeUrl
  )
  // 求人個別の写真を優先し、無ければ会社単位の写真にフォールバック
  // (HW 求人や写真未設定の求人は従来どおり会社写真を使う)
  const photos =
    job.imageUrls && job.imageUrls.length > 0
      ? job.imageUrls
      : job.company?.photos ?? []

  // メイン写真が無い求人は、指定の 15 枚から求人 ID をシードに決定的に 1 枚選ぶ
  // (写真ギャラリーには使わず、ヒーローの見栄え用フォールバックとしてのみ使用)
  const heroPhoto = photos[0] ?? pickDefaultJobImage(job.id)

  const mapAddress = buildMapAddress(job.address, job.prefecture, job.city)

  const tocItems = buildTocItems({
    hasRecommendation: !!recommendation,
    hasFeatures: job.tags.length > 0 || !!job.employmentType,
    hasDescription: !!job.description,
    hasPitch: !!job.company?.pitchHighlights,
    hasIdealCandidate: !!job.company?.idealCandidate,
    hasEmployeeVoice: !!job.company?.employeeVoice,
    hasPhotos: photos.length > 0,
    hasWorkConditions:
      !!job.description ||
      !!job.requirements ||
      !!job.workHours ||
      !!job.holidays ||
      job.annualHolidays != null ||
      !!job.insurance,
    hasSalaryDetail,
    hasBenefits,
    hasNotes: !!job.jobConditionNotes,
    hasRequirements,
    hasMap: !!mapAddress,
    hasCompany: !!job.company,
  })

  const breadcrumb = generateBreadcrumbSchema([
    { name: "トップ", url: "/" },
    { name: "求人検索", url: "/jobs" },
    {
      name: getCategoryLabel(job.category),
      url: `/jobs?category=${job.category}`,
    },
    { name: job.title, url: `/jobs/${job.id}` },
  ])

  // 11.7 類似求人レコメンド: findRelatedJobs ヘルパーで 4 件取得
  // (同カテゴリ × 同県 → 同カテゴリ → 同県 → 全国 のフォールバック)
  const relatedJobs = await findRelatedJobs(job.id, 4).catch(() => [])

  // 12.3 ログインユーザーがこの求人を「気になる」登録しているか
  const loggedInUserId = session?.user?.id
  const isInterested = loggedInUserId
    ? !!(await prisma.jobInterest
        .findUnique({
          where: {
            userId_jobId: { userId: loggedInUserId, jobId: job.id },
          },
          select: { userId: true },
        })
        .catch(() => null))
    : false

  return (
    <div className="bg-gray-50 min-h-screen pb-24 sm:pb-28">
      <JobViewBeacon jobId={job.id} enabled={!isPreview} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {/* VideoObject: 動画つき求人で「動画あり」リッチリザルトを狙う */}
      {job.videoUrls.length > 0 &&
        job.videoUrls.slice(0, 3).map((videoUrl) => (
          <script
            key={videoUrl}
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(
                generateVideoObjectSchema({
                  jobId: job.id,
                  jobTitle: job.title,
                  videoUrl,
                  uploadDate: job.publishedAt ?? job.createdAt,
                  description:
                    job.description?.slice(0, 280) ??
                    `${job.title} の紹介動画`,
                }),
              ),
            }}
          />
        ))}

      {isPreview && (
        <div className="bg-amber-100 border-b border-amber-300">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-2 flex items-center gap-2 text-xs font-bold text-amber-900">
            <span className="inline-flex items-center px-2 py-0.5 bg-amber-300 text-amber-900">
              PREVIEW
            </span>
            このページは社内チェック用のプレビュー URL からアクセスされています。検索エンジンや一般公開には掲載されません（求人ステータス: {job.status}）。
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1 text-xs text-gray-500 overflow-x-auto whitespace-nowrap">
            <Link href="/" className="hover:text-primary-600 shrink-0">
              トップ
            </Link>
            <CaretRight weight="duotone" className="h-3 w-3 shrink-0" />
            <Link href="/jobs" className="hover:text-primary-600 shrink-0">
              求人検索
            </Link>
            <CaretRight weight="duotone" className="h-3 w-3 shrink-0" />
            <Link
              href={`/jobs?category=${job.category}`}
              className="hover:text-primary-600 shrink-0"
            >
              {getCategoryLabel(job.category)}
            </Link>
            <CaretRight weight="duotone" className="h-3 w-3 shrink-0" />
            <span className="text-gray-700 line-clamp-1">{job.title}</span>
          </nav>
          <div className="ml-auto mt-1 flex items-center">
            <a
              href={`/jobs/${job.id}/print?auto=1`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-bold text-gray-600 hover:text-primary-700"
              title="ブラウザの「PDF として保存」で求人情報を出力"
            >
              PDF で保存
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col-reverse gap-6 lg:flex-row">
          {/* Main column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Hero + title block */}
            <section id="features" className="space-y-4">
              <HeroBanner category={job.category} photo={heroPhoto} />

              <div className="space-y-3">
                {/* Source + Category badges */}
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  {job.source === "direct" ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                      認定企業
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      公共求人
                    </span>
                  )}
                  <TagChip size="sm">{getCategoryLabel(job.category)}</TagChip>
                </div>

                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 leading-tight">
                  {job.title}
                </h1>

                {tagline && (
                  <p className="flex items-start gap-1.5 text-sm sm:text-base text-primary-700 font-medium">
                    <Megaphone weight="duotone" className="h-4 w-4 mt-0.5 shrink-0" />
                    <span>{tagline}</span>
                  </p>
                )}

                {job.company && (
                  <div className="flex items-center gap-3 p-3 border bg-white">
                    <div className="h-10 w-10 flex items-center justify-center bg-primary-50">
                      <Buildings weight="duotone" className="h-5 w-5 text-primary-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 line-clamp-1">
                        {job.company.name}
                      </p>
                      {(job.company.prefecture || job.company.city) && (
                        <p className="text-xs text-gray-500 line-clamp-1">
                          {[
                            job.company.prefecture,
                            job.company.city,
                          ]
                            .filter(Boolean)
                            .join(" ")}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick info row */}
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Money weight="duotone" className="h-4 w-4 text-primary-500" />
                    <dt className="text-gray-500 mr-1">
                      {salaryUnitLabel(job.salaryType)}:
                    </dt>
                    <dd className="font-bold text-primary-700">
                      {job.salaryMin
                        ? formatSalary(
                            job.salaryMin,
                            job.salaryMax,
                            job.salaryType
                          )
                            .replace(/^(月給|時給|年収|日給)\s*/, "")
                        : "応相談"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin weight="duotone" className="h-4 w-4 text-primary-500" />
                    <dt className="text-gray-500 mr-1">勤務地:</dt>
                    <dd className="font-medium text-gray-900">
                      {job.prefecture}
                      {job.city ? ` ${job.city}` : ""}
                    </dd>
                  </div>
                  {hasOccupationMeta && (
                    <div className="flex items-center gap-2 text-sm">
                      <Briefcase weight="duotone" className="h-4 w-4 text-primary-500" />
                      <dt className="text-gray-500 mr-1">職種:</dt>
                      <dd className="font-medium text-gray-900 line-clamp-1">
                        {job.occupationTitle ??
                          job.occupationCategoryName ??
                          job.jobTypeName}
                        {job.occupationCategoryName &&
                          job.occupationTitle &&
                          job.occupationCategoryName !== job.occupationTitle && (
                            <span className="ml-1.5 text-xs text-gray-500">
                              （{job.occupationCategoryName}）
                            </span>
                          )}
                      </dd>
                    </div>
                  )}
                  {validUntilInfo && (
                    <div className="flex items-center gap-2 text-sm">
                      <ClockCountdown
                        weight="duotone"
                        className={`h-4 w-4 ${
                          validUntilInfo.isUrgent
                            ? "text-red-500"
                            : "text-primary-500"
                        }`}
                      />
                      <dt className="text-gray-500 mr-1">応募締切:</dt>
                      <dd
                        className={`font-medium ${
                          validUntilInfo.isUrgent
                            ? "text-red-600"
                            : "text-gray-900"
                        }`}
                      >
                        {validUntilInfo.label}
                        {validUntilInfo.daysLeft != null && (
                          <span
                            className={`ml-1.5 text-xs font-bold ${
                              validUntilInfo.isUrgent
                                ? "text-red-600"
                                : "text-gray-500"
                            }`}
                          >
                            （あと {validUntilInfo.daysLeft}日）
                          </span>
                        )}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </section>

            {/* この求人のおすすめポイント (マイナビ転職風: 中央寄せ見出し + 短い下線 + 区切り線リスト) */}
            {recommendation && (
              <section
                id="recommendation"
                className="border border-primary-200 bg-primary-50/40 p-5 sm:p-6 space-y-4"
              >
                <SectionHeading variant="centered">
                  この求人のポイント
                </SectionHeading>
                <p className="text-sm sm:text-[15px] text-ink-900 leading-relaxed font-medium">
                  {recommendation.summary}
                </p>
                {recommendation.points.length > 0 && (
                  <ul className="divide-y divide-dashed divide-primary-300/60 border-y border-dashed border-primary-300/60">
                    {recommendation.points.map((p) => (
                      <li
                        key={p.label}
                        className="py-2.5 text-sm font-bold text-ink-900"
                      >
                        【{p.label}】
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* Structured tag table */}
            <JobInfoTable
              employmentType={job.employmentType}
              tagGroups={tagGroups}
            />

            {/* Description */}
            {job.description && (
              <AccordionSection
                id="description"
                title="仕事内容"
                defaultOpen
              >
                <JobDescription text={job.description} />
              </AccordionSection>
            )}

            {/* こんなトコロがすごい！ */}
            {job.company?.pitchHighlights && (
              <AccordionSection
                id="pitch"
                title="この会社のここがすごい"
                defaultOpen
              >
                <FormattedText text={job.company.pitchHighlights} />
              </AccordionSection>
            )}

            {/* こんな人が向いています！ */}
            {job.company?.idealCandidate && (
              <AccordionSection
                id="ideal"
                title="こんな方を歓迎します"
              >
                <FormattedText text={job.company.idealCandidate} />
              </AccordionSection>
            )}

            {/* 働いている社員の声 */}
            {job.company?.employeeVoice && (
              <AccordionSection
                id="voice"
                title="現場で働く先輩の声"
              >
                <FormattedText text={job.company.employeeVoice} />
              </AccordionSection>
            )}

            {/* 写真ギャラリー */}
            {photos.length > 0 && (
              <AccordionSection
                id="photos"
                title="現場の写真"
                defaultOpen
              >
                <PhotoGallery
                  photos={photos}
                  alt={job.company?.name ?? "求人写真"}
                />
              </AccordionSection>
            )}

            {/* Video gallery */}
            {job.videoUrls.length > 0 && (
              <section
                id="videos"
                className="border bg-white p-5 sm:p-6 shadow-sm"
              >
                <ClientErrorBoundary name="job-video-gallery" fallback={null}>
                  <VideoGallery urls={job.videoUrls} />
                </ClientErrorBoundary>
              </section>
            )}

            {/* 募集要項（左ラベル/右本文の2カラム・建職バンク参考）*/}
            <JobSpec job={job} />


            {/* 勤務地の地図 */}
            {mapAddress && (
              <AccordionSection
                id="map"
                title="勤務地の地図"
              >
                <MapEmbed address={mapAddress} />
              </AccordionSection>
            )}

            {/* Company info */}
            {job.company && (
              <AccordionSection
                id="company"
                title="会社情報"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <DlItem label="企業名" value={job.company.name} />
                  {job.company.industry && (
                    <DlItem
                      label="業種"
                      value={job.company.industry}
                      icon={<Factory weight="duotone" className="h-3.5 w-3.5 text-gray-400" />}
                    />
                  )}
                  {job.company.employeeCount && (
                    <DlItem
                      label="従業員数"
                      value={`${job.company.employeeCount}名`}
                      icon={<UsersThree weight="duotone" className="h-3.5 w-3.5 text-gray-400" />}
                    />
                  )}
                  {(job.company.prefecture || job.company.address) && (
                    <DlItem
                      label="所在地"
                      value={[
                        job.company.prefecture,
                        job.company.city,
                        job.company.address,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      icon={<MapPin weight="duotone" className="h-3.5 w-3.5 text-gray-400" />}
                    />
                  )}
                  {(job.company.websiteUrl || job.companyUrl) && (
                    <DlItem
                      label="Web サイト"
                      value={(job.company.websiteUrl ?? job.companyUrl) as string}
                      icon={<Globe weight="duotone" className="h-3.5 w-3.5 text-gray-400" />}
                      isLink
                    />
                  )}
                </div>
                {job.businessContent && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500">事業内容</p>
                    <FormattedText text={job.businessContent} />
                  </div>
                )}
                {job.companyFeatures && (
                  <div className="border-t pt-4 space-y-2">
                    <p className="text-xs font-medium text-gray-500">会社の特長</p>
                    <FormattedText text={job.companyFeatures} />
                  </div>
                )}
                {job.company.description && (
                  <div className="border-t pt-4">
                    <FormattedText text={job.company.description} />
                  </div>
                )}

                {/* 公式 HP リンクボタン（CTAとして目立たせる） */}
                {job.company.websiteUrl && (
                  <a
                    href={job.company.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 border border-primary-500 px-4 py-2 text-sm font-medium text-primary-700 hover:bg-primary-50 transition"
                  >
                    <Globe weight="duotone" className="h-4 w-4" />
                    {job.company.name} 公式 HP を見る
                  </a>
                )}

                {hasSns && (
                  <div className="border-t pt-4">
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                      <ShareNetwork weight="duotone" className="h-3.5 w-3.5" />
                      公式 SNS
                    </p>
                    <SnsLinks
                      sns={{
                        instagramUrl: job.company.instagramUrl,
                        tiktokUrl: job.company.tiktokUrl,
                        facebookUrl: job.company.facebookUrl,
                        xUrl: job.company.xUrl,
                        youtubeUrl: job.company.youtubeUrl,
                      }}
                    />
                  </div>
                )}
              </AccordionSection>
            )}

            {/* HW notice */}
            {job.source === "hellowork" && (
              <p className="text-xs text-gray-400 leading-relaxed">
                この求人は公共職業安定所の公開情報より転載しています。最新の情報は公共職業安定所窓口でご確認ください。
              </p>
            )}

            {/* この求人に関するよくある質問（FAQ） */}
            <JobFaq job={job} />

            {/* 11.7 関連求人 (類似求人レコメンド) */}
            {relatedJobs.length > 0 && (
              <section className="border-t pt-6">
                <h2 className="text-base font-bold text-gray-900">
                  この求人を見た人におすすめ
                </h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {relatedJobs.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/jobs/${r.id}`}
                        className="block border bg-white p-3 transition hover:border-primary-400 hover:shadow-sm"
                      >
                        <p className="text-sm font-bold text-gray-900 line-clamp-2">
                          {r.title}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                          <span>{getCategoryLabel(r.category)}</span>
                          <span>
                            {r.prefecture}
                            {r.city ? ` / ${r.city}` : ""}
                          </span>
                          {r.companyName && (
                            <span className="truncate max-w-[150px]">
                              {r.companyName}
                            </span>
                          )}
                        </div>
                        {r.salaryMin && (
                          <p className="mt-1 text-sm font-semibold text-primary-600">
                            {r.salaryMin.toLocaleString()}円〜
                            {r.salaryMax
                              ? `${r.salaryMax.toLocaleString()}円`
                              : ""}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 内部リンク強化: 関連エリア × 同職種、同エリア × 他職種 */}
            <RelatedAreaCategoryLinks
              category={job.category}
              categoryLabel={getCategoryLabel(job.category)}
              prefecture={job.prefecture}
            />

            {/* Back link + Report */}
            <div className="flex items-center justify-between">
              <Link
                href="/jobs"
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600"
              >
                <ArrowLeft weight="duotone" className="h-4 w-4" />
                求人一覧に戻る
              </Link>
              <ReportButton targetType="job" targetId={job.id} label="この求人を通報" />
            </div>
          </div>

          {/* Right TOC */}
          <RightTocNav items={tocItems} />
        </div>
      </div>

      {/* Bottom sticky action bar */}
      <StickyActionBar
        jobId={job.id}
        title={job.title}
        companyName={job.company?.name ?? null}
        salaryLabel={
          job.salaryMin
            ? formatSalary(job.salaryMin, job.salaryMax, job.salaryType)
            : null
        }
        initialInterested={isInterested}
        loggedIn={!!loggedInUserId}
      />
    </div>
  )
}

function DlItem({
  label,
  value,
  icon,
  isLink,
}: {
  label: string
  value: string
  icon?: React.ReactNode
  isLink?: boolean
}) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-xs text-gray-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-gray-900">
        {isLink ? (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 hover:underline truncate block"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  )
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`
}

/**
 * 応募締切（validUntil）を表示用ラベルと残日数に整形する。
 * 期限切れ・無効値の場合は null を返す。残日数 7 日以下は urgent 扱い。
 */
function computeValidUntilInfo(validUntil: Date | null): {
  label: string
  daysLeft: number | null
  isUrgent: boolean
} | null {
  if (!validUntil) return null
  const now = Date.now()
  const target = validUntil.getTime()
  const diffMs = target - now
  if (diffMs < 0) return null // 期限切れ
  const daysLeft = Math.ceil(diffMs / (24 * 60 * 60 * 1000))
  return {
    label: formatDate(validUntil),
    daysLeft,
    isUrgent: daysLeft <= 7,
  }
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  const unit = salaryUnitLabel(type)
  const useManYen = type !== "hourly" && type !== "daily"
  const fmt = (n: number) =>
    useManYen && n >= 10000
      ? `${(n / 10000).toFixed(0)}万`
      : `${n.toLocaleString()}`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  if (min) return `${unit} ${fmt(min)}円〜`
  return ""
}

function salaryUnitLabel(type: string | null): string {
  switch (type) {
    case "hourly":
      return "時給"
    case "annual":
      return "年収"
    case "daily":
      return "日給"
    case "monthly":
    default:
      return "月給"
  }
}

/**
 * description の冒頭 1〜2 文をハイライトに使う。
 * 「【】」「■」「◆」セクション見出しが直後に来る場合はそこまで、
 * なければ最初の句点 / 改行までを返す。
 */
function extractTagline(description: string | null): string | null {
  if (!description) return null
  const trimmed = description.trim()
  if (!trimmed) return null

  // 見出し系で始まる場合（【仕事内容】... のような）はその直後の本文から
  const afterHead = trimmed.match(
    /^(?:【[^】]{1,30}】|■\s*[^\n]{1,30}|◆\s*[^\n]{1,30})\s*([\s\S]+)$/
  )
  const body = afterHead ? afterHead[1] : trimmed

  // 最初の句点 or 改行で切る
  const m = body.match(/^([^。\n]{8,80})[。\n]/)
  if (m) return m[1].trim() + "。"

  // 短いテキストの場合はそのまま（最大 80 字）
  return body.slice(0, 80)
}

function buildTocItems(flags: {
  hasRecommendation: boolean
  hasFeatures: boolean
  hasDescription: boolean
  hasPitch: boolean
  hasIdealCandidate: boolean
  hasEmployeeVoice: boolean
  hasPhotos: boolean
  hasWorkConditions: boolean
  hasSalaryDetail: boolean
  hasBenefits: boolean
  hasNotes: boolean
  hasRequirements: boolean
  hasMap: boolean
  hasCompany: boolean
}) {
  const items: Array<{ id: string; label: string }> = []
  if (flags.hasRecommendation)
    items.push({ id: "recommendation", label: "おすすめポイント" })
  if (flags.hasFeatures) items.push({ id: "features", label: "求人の特徴" })
  if (flags.hasDescription)
    items.push({ id: "description", label: "こんな仕事です" })
  if (flags.hasPitch)
    items.push({ id: "pitch", label: "こんなトコロがすごい" })
  if (flags.hasIdealCandidate)
    items.push({ id: "ideal", label: "こんな人が向いています" })
  if (flags.hasEmployeeVoice)
    items.push({ id: "voice", label: "働いている社員の声" })
  if (flags.hasPhotos) items.push({ id: "photos", label: "写真ギャラリー" })
  if (flags.hasWorkConditions)
    items.push({ id: "conditions", label: "勤務条件" })
  if (flags.hasSalaryDetail)
    items.push({ id: "salary-detail", label: "給与・手当" })
  if (flags.hasBenefits)
    items.push({ id: "benefits", label: "待遇・福利厚生" })
  if (flags.hasNotes) items.push({ id: "notes", label: "特記事項" })
  if (flags.hasRequirements)
    items.push({ id: "requirements", label: "応募要件" })
  if (flags.hasMap) items.push({ id: "map", label: "勤務地の地図" })
  if (flags.hasCompany) items.push({ id: "company", label: "企業情報" })
  return items
}

/**
 * MapEmbed に渡す住所文字列を組み立てる。
 * address が入っていればそれを優先、無ければ prefecture + city。
 * Google Maps の検索クエリとして使えるよう正規化。
 */
function buildMapAddress(
  address: string | null,
  prefecture: string,
  city: string | null
): string | null {
  if (address && address.trim().length > 0) return address.trim()
  const parts = [prefecture, city].filter((s) => s && s.trim().length > 0)
  if (parts.length === 0) return null
  // 「不明」など意味のない値は除外
  if (parts.every((p) => p === "不明")) return null
  return parts.join(" ")
}
