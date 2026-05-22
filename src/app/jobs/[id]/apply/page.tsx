import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, MessageCircle, MapPin } from "lucide-react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { PUBLIC_LINE_OA_ID, isLineConfigured } from "@/lib/line"
import { LineApplyClient } from "./line-apply-client"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    select: { title: true },
  })
  if (!job) return { title: "求人が見つかりません" }
  return { title: `${job.title} に応募` }
}

export default async function ApplyPage({ params }: Props) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      prefecture: true,
      city: true,
      status: true,
      helloworkId: true,
      company: { select: { name: true } },
    },
  })

  if (!job) notFound()

  // User-Agent からモバイル判定（クライアント側でも再判定するが、初期レンダリングを正しく出すため）
  const ua = (await headers()).get("user-agent") ?? ""
  const isMobileGuess = /iPhone|Android|Mobile/i.test(ua)
  const configured = isLineConfigured()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/jobs/${job.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        求人詳細に戻る
      </Link>

      <div className="mt-4 border bg-white p-6 shadow-sm">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <MessageCircle className="h-6 w-6 text-[#06C755]" />
          LINE で応募する
        </h1>

        {/* Job summary */}
        <div className="mt-4 bg-gray-50 p-4">
          <p className="font-semibold text-gray-900">{job.title}</p>
          {job.company && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
              <Building2 className="h-4 w-4" />
              {job.company.name}
            </p>
          )}
          <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-4 w-4 text-gray-400" />
            {job.prefecture}
            {job.city ? ` ${job.city}` : ""}
          </p>
        </div>

        {job.status !== "active" ? (
          <div className="mt-6 border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            この求人は現在募集を停止しているため、応募できません。
          </div>
        ) : !configured ? (
          <div className="mt-6 border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            応募導線の準備中です。お手数ですが、しばらく経ってから再度お試しください。
          </div>
        ) : (
          <LineApplyClient
            jobId={job.id}
            isMobileGuess={isMobileGuess}
            lineOaId={PUBLIC_LINE_OA_ID}
          />
        )}

        {/* How it works */}
        <div className="mt-6 text-xs text-gray-500 leading-relaxed">
          <p className="font-medium text-gray-700 mb-1">応募の流れ</p>
          <ol className="list-decimal pl-5 space-y-0.5">
            <li>「LINE で応募」ボタンを押すと、当社公式 LINE のチャットが開きます。</li>
            <li>事前入力されたメッセージを送信してください。</li>
            <li>担当者から折り返しご連絡いたします（平日 10:00〜18:00 / 通常 1 営業日以内）。</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
