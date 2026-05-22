import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { FileText, Upload, PenLine } from "lucide-react"
import { ResumeBuilder } from "./resume-builder"
import { FileUploader } from "./file-uploader"

export const metadata: Metadata = {
  title: "履歴書・職務経歴書",
}

export default async function ResumePage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [resume, uploadedFiles] = await Promise.all([
    prisma.resume.findUnique({ where: { userId: session.user.id } }),
    prisma.uploadedFile.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ])

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true, phone: true, prefecture: true, city: true, birthDate: true },
  })

  // Pre-fill from user profile if resume doesn't exist
  const initialData = resume
    ? {
        fullName: resume.fullName ?? "",
        furigana: resume.furigana ?? "",
        birthDate: resume.birthDate?.toISOString().split("T")[0] ?? "",
        gender: resume.gender ?? "",
        postalCode: resume.postalCode ?? "",
        address: resume.address ?? "",
        phone: resume.phone ?? "",
        email: resume.email ?? "",
        educationHistory: (resume.educationHistory as Array<{year: string; month: string; content: string}>) ?? [],
        workHistory: (resume.workHistory as Array<{year: string; month: string; content: string}>) ?? [],
        licenses: (resume.licenses as Array<{year: string; month: string; name: string}>) ?? [],
        motivation: resume.motivation ?? "",
        selfPr: resume.selfPr ?? "",
        careerSummary: resume.careerSummary ?? "",
        careerDetails: (resume.careerDetails as Array<{company: string; period: string; position: string; description: string}>) ?? [],
        skills: resume.skills ?? [],
        qualifications: resume.qualifications ?? [],
      }
    : {
        fullName: user?.name ?? "",
        furigana: "",
        birthDate: user?.birthDate?.toISOString().split("T")[0] ?? "",
        gender: "",
        postalCode: "",
        address: [user?.prefecture, user?.city].filter(Boolean).join(" "),
        phone: user?.phone ?? "",
        email: user?.email ?? session.user.email ?? "",
        educationHistory: [],
        workHistory: [],
        licenses: [],
        motivation: "",
        selfPr: "",
        careerSummary: "",
        careerDetails: [],
        skills: [],
        qualifications: [],
      }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">履歴書・職務経歴書</h1>
        <div className="flex items-center gap-3">
          <a
            href="/mypage/resume/print?auto=1"
            target="_blank"
            rel="noopener noreferrer"
            className="press inline-flex items-center gap-1.5 border border-primary-300 bg-white hover:bg-primary-50 px-3 py-2 text-sm font-bold text-primary-700"
            title="入力内容を PDF として保存"
          >
            PDF で保存
          </a>
          <Link
            href="/mypage"
            className="text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ← マイページ
          </Link>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="mt-6 flex gap-4 border-b">
        <span className="flex items-center gap-1.5 border-b-2 border-primary-600 px-1 pb-2 text-sm font-medium text-primary-600">
          <PenLine className="h-4 w-4" />
          作成する
        </span>
        <a href="#upload" className="flex items-center gap-1.5 px-1 pb-2 text-sm font-medium text-gray-500 hover:text-gray-700">
          <Upload className="h-4 w-4" />
          アップロード
        </a>
      </div>

      {/* Resume builder */}
      <div className="mt-6">
        <ResumeBuilder initialData={initialData} />
      </div>

      {/* File upload section */}
      <div id="upload" className="mt-12 scroll-mt-20">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 border-b pb-2">
          <Upload className="h-5 w-5 text-primary-600" />
          ファイルアップロード
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          作成済みの履歴書・職務経歴書をアップロードできます（PDF / Word, 10MB以下）
        </p>
        <FileUploader />

        {uploadedFiles.length > 0 && (
          <div className="mt-4 space-y-2">
            <h3 className="text-sm font-medium text-gray-700">アップロード済みファイル</h3>
            {uploadedFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between border bg-white p-3">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.fileName}</p>
                    <p className="text-xs text-gray-400">
                      {f.fileType === "resume" ? "履歴書" : f.fileType === "cv" ? "職務経歴書" : "その他"} ・ {(f.fileSize / 1024).toFixed(0)}KB ・ {f.createdAt.toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>
                <a
                  href={f.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary-600 hover:text-primary-700"
                >
                  表示
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
