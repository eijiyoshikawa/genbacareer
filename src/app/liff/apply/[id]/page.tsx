import { notFound } from "next/navigation"
import { prisma } from "@/lib/db"
import { LiffApplyForm } from "./liff-apply-form"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "LINE で応募 | ゲンバキャリア",
  robots: { index: false, follow: false },
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function LiffApplyPage({ params }: Props) {
  const { id } = await params
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID ?? ""

  const job = await prisma.job
    .findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        category: true,
        prefecture: true,
        city: true,
        status: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        company: { select: { name: true } },
      },
    })
    .catch(() => null)

  if (!job || job.status !== "active") notFound()
  if (!CONSTRUCTION_CATEGORY_VALUES.includes(job.category as never)) notFound()

  return (
    <div className="min-h-screen bg-warm-50">
      <div className="mx-auto max-w-md p-4">
        <header className="bg-[#06C755] text-white p-4 mb-4">
          <p className="text-xs tracking-wider font-bold opacity-80">LINE 応募</p>
          <h1 className="mt-0.5 text-lg font-extrabold leading-tight">{job.title}</h1>
          <p className="mt-1 text-xs opacity-90">
            {job.company?.name ?? "（企業非公開）"} / {job.prefecture}
            {job.city ? ` ${job.city}` : ""}
          </p>
        </header>

        <LiffApplyForm
          liffId={liffId}
          jobId={job.id}
          jobTitle={job.title}
        />
      </div>
    </div>
  )
}
